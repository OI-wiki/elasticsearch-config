var http = require('http');
var YAML = require('yaml');
var createHandler = require('github-webhook-handler');
var handler = createHandler({ path: '/MY_SECRET_PATH', secret: 'MY_SECRET_KEY' });
const elasticsearch = require('elasticsearch');
const esHost = 'localhost:9200';
const articlePath = '/home/ubuntu/OI-wiki';
var client = new elasticsearch.Client({
  host: esHost,
});


let remark = require('remark');
let strip = require('strip-markdown-math');
const math = require("remark-math");
remark = remark()
  .use(math)
  .use(strip);

const fs = require('fs');
const { exec } = require('child_process');


/**
 * Traversal all articles.
 *
 * @param data     - Data of files
 * @param callback - Call function(key, value)
 */
function traversalArticle(data, callback) {
  if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) return;

  for (const item of (Array.isArray(data) ? data : Object.values(data))) {
    if (typeof item === 'string') {
      callback(Object.keys(data).find(key => data[key] === item), item);
    }
    traversalArticle(item, callback);
  }
  return;
}

/**
 * Get article's content by filename.
 *
 * @param filename - Filename likes 'tools/editor/atom.md'
 * @param data     - Data of mkdocs.yml
 */
function getContent(filename, data) {
  let file;
  try {
    file = String(fs.readFileSync(`${articlePath}/docs/` + filename));
  } catch (e) {
    console.error(`Error reading file ${filename}:`, e);
    return ['', '', ''];
  }

  const h1reg = /^# .+$/gm, h2reg = /^## .+$/gm, authorreg = /author:[^\n]*/gm;
  const lines = file.split('\n').filter(e => !e.match(authorreg));
  let others = lines.filter((e) => !e.match(h1reg) && !e.match(h2reg));
  let title = lines[0] && lines[0].match(h1reg) ?
    lines[0].replace('# ', '') : '';
  traversalArticle(data['nav'], (key, value) => {
    if(value == filename) title = key;
  });
  const h2 = lines.filter(e => e.match(h2reg));


  remark.process(others.join('\n'), (err, file) => {
    if (err) {
      console.error('Remark processing error:', err);
      return;
    }
    others = String(file)
      .replace('"', "")
      .replace("\\n\\n", "\\n");
  });

  return [title, others, h2];
}

/**
 * update articles' content to ES.
 *
 * @param modified - Array of added/modified files
 * @param removed - Array of removed files
 */
function updateContent(modified, removed) {
  const file = String(fs.readFileSync(`${articlePath}/mkdocs.yml`));
  const data = YAML.parse(file);
  let ops = [];
  modified.forEach((filename) => {
    ops.push({ index: { _index: 'oiwiki', _type: 'article', _id: filename } });
    let [title, article, h2] = getContent(filename, data);
    ops.push({
      title: title,
      content: article,
      url: '/' + filename.replace('/index.md', '/').replace('.md', '/'),
      h2: h2,
    });
  });
  removed.forEach((filename) => {
    ops.push({ delete: { _index: 'oiwiki', _type: 'article', _id: filename } });
  });
  client.bulk({ body: ops, refresh: 'true' }, function (err, res) {
    if (err) {
      console.error('Failed Bulk opoeration', err);
      res.statusCode = 504;
      res.end('elasticsearch bulk op failed');
      return;
    }
    console.debug('Elasticsearch bulk op success');
  });
}

http.createServer((req, res) => {
  handler(req, res, (err) => {
    res.statusCode = 404;
    res.end('request unsuccessful');
    console.error('Verified error:', err);
  });
}).listen(3000);

handler.on('error', (err) => {
  console.error('Handler error:', err.message);
});

handler.on('push', (event) => {
  if (event.payload.ref !== 'refs/heads/master') return;

  console.debug('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref);

  exec('bash update.sh', (err) => {
    if (err) {
      console.error('Shell command execution error:', err);
      return;
    }
    let removed = new Set([]), modified = new Set([]);
    event.payload.commits.forEach((e) => {
      e.added.forEach(w => {
        modified.add(w);
        removed.delete(w);
      });
      e.modified.forEach(w => modified.add(w));
      e.removed.forEach(w => {
        removed.add(w);
        modified.delete(w);
      });
    });

    removed = [...removed].filter(e => e.startsWith('docs') && e.endsWith('md'));
    modified = [...modified].filter(e => e.startsWith('docs') && e.endsWith('md'));

    updateContent(modified, removed);
  });
});

function init() {
  exec(`curl -X DELETE "http://${esHost}/oiwiki"`);
  let modified = [];
  const file = String(fs.readFileSync(`${articlePath}/mkdocs.yml`));
  const data = YAML.parse(file);
  traversalArticle(data['nav'], (key, value) => modified.push(value));
  updateContent(modified, []);
}

init();