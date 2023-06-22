/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// const functions = require("firebase-functions");

const express = require("express");
const { PineconeClient } = require("@pinecone-database/pinecone");
const { uuid } = require("uuidv4");

const app = express();

const cors = require("cors");
app.use(cors());

var bodyParser = require("body-parser");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const pineconeClient = new PineconeClient();

async function run() {
  await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  let index = pineconeClient.Index("study-notes");

  return index;
}

const getEmbedding = async (input) => {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: input,
  });

  const { data } = response.data;

  return data[0];
};

const embedBatch = async (texts, callback) => {
  for (let batch of texts) {
    let embeddingID = uuid();

    batch = batch.replace(/\n/g, " ");
    console.log("chunk...", batch);

    // let embedding;
    const embeddings = await getEmbedding(batch).then(
      (result) => result.embedding
    );

    console.log(embeddings);

    callback(batch, embeddings, embeddingID);
  }
};

app.get("/", async (req, res) => {
  res.json({
    openai: process.env.OPENAI_API_KEY,
    pineconeKey: process.env.PINECONE_API_KEY,
    pineconeEnv: process.env.PINECONE_ENVIRONMENT,
  });
});

app.post("/", async (req) => {
  let index = await run();

  const { chunks, fileID } = req.body;
  //   const chunks = ["hello", "world"];
  //   const fileID = "1234";
  try {
    let embeddingRefs = [];

    await embedBatch(chunks, async (chunk, embedding, embeddingID) => {
      console.log("embedding:", embedding);

      const upsertRequest = {
        vectors: [
          {
            id: embeddingID,
            values: embedding,
            metadata: {
              type: "study-notes",
              originalText: chunk,
              documentID: fileID,
            },
          },
        ],
        namespace: "tester1",
      };

      embeddingRefs.push({ id: embeddingID, fileID: fileID });

      await index.upsert({ upsertRequest });
      console.log("done upsert");
    })
      .then(() => {
        return { response: "success", embeddingsUpserted: embeddingRefs };
        // console.log(embeddingRefs);
      })
      .catch((error) => {
        return { response: "error", errorMessage: error };
      });
  } catch (error) {
    return { response: "error", errorMessage: error };
  }
});

exports.embedAndUpsert = onRequest({
    timeoutSeconds: 300,
    memory: "1GiB",
  }, async (req, res) => {
    let index = await run();
  
    const { chunks, fileID } = req.body;
    //   const chunks = ["hello", "world"];
    //   const fileID = "1234";
    try {
      let embeddingRefs = [];
  
      await embedBatch(chunks, async (chunk, embedding, embeddingID) => {
        console.log("embedding:", embedding);
  
        const upsertRequest = {
          vectors: [
            {
              id: embeddingID,
              values: embedding,
              metadata: {
                type: "study-notes",
                originalText: chunk,
                documentID: fileID,
              },
            },
          ],
          namespace: "tester1",
        };
  
        embeddingRefs.push({ id: embeddingID, fileID: fileID });
  
        await index.upsert({ upsertRequest });
        console.log("done upsert");
      })
        .then(() => {
          res.json({ response: "success", embeddingsUpserted: embeddingRefs });
          // console.log(embeddingRefs);
        })
        .catch((error) => {
          res.json({ response: "error", errorMessage: error });
        });
    } catch (error) {
      res.json({ response: "error", errorMessage: error });
    }});


