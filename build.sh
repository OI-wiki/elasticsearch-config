curl -X DELETE "http://localhost:9200/oiwiki"
curl -H'Content-Type: application/json' -XPUT "http://localhost:9200/oiwiki" -d'
{
  "settings": {
    "index.max_ngram_diff": 9,
    "analysis": {
      "analyzer": {
        "pinyin_analyzer": {
          "tokenizer": "ik_max_word",
          "filter": "pinyin_filter"
        },
        "pinyin_search_analyzer": {
          "tokenizer": "ik_max_word"
        },
        "ngram_analyzer": {
          "tokenizer": "ngram_tokenizer"
        }
      },
      "filter": {
        "pinyin_filter": {
          "type": "pinyin",
          "keep_original": true,
          "limit_first_letter_length": 16,
          "keep_joined_full_pinyin": true
        }
      },
      "tokenizer": {
        "ngram_tokenizer": {
          "type": "ngram",
          "min_gram": 1,
          "max_gram": 9,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "analyzer": "pinyin_analyzer",
        "search_analyzer": "pinyin_search_analyzer"
      },
      "h2": {
        "type": "text",
        "analyzer": "pinyin_analyzer",
        "search_analyzer": "pinyin_search_analyzer"
      },
      "title": {
        "type": "text",
        "analyzer": "pinyin_analyzer",
        "search_analyzer": "pinyin_search_analyzer"
      },
      "url": {
        "type": "text",
        "analyzer": "ngram_analyzer",
        "search_analyzer": "ngram_analyzer"
      },
      "bold": {
        "type": "text",
        "analyzer": "pinyin_analyzer",
        "search_analyzer": "pinyin_search_analyzer"
      },
      "ngram_content": {
        "type": "text",
        "analyzer": "ngram_analyzer",
        "search_analyzer": "ngram_analyzer"
      }
    }
  }
}'