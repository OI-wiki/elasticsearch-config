# elasticsearch-config

部署需要有 es 环境并安装好 ik 与 pinyin 插件：

```
npm install
git clone https://github.com/OI-wiki/OI-wiki.git /home/ubuntu/OI-wiki
cd /home/ubuntu/OI-wiki
git remote add gh https://github.com/OI-wiki/OI-wiki.git
```

初始化并启动 webhook：

```
npm run webhook
```

测试：

```
npm run test
```

启动 api 接口：

```
npm run serve
```

统计：

```
curl -H'Content-Type: application/json' -XGET http://localhost:PORT/oiwiki/_count
```

清空

```
curl -H'Content-Type: application/json' -XPOST "http://localhost:PORT/oiwiki/_delete_by_query" -d'
{
     "query":{
          "match_all":{}
      }
}'

```

