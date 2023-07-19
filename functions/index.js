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
// const textract = require("textract");

const app = express();

const cors = require("cors")({ origin: true });
// app.use(cors());

// var bodyParser = require("body-parser");

// app.use(
//   bodyParser.urlencoded({
//     extended: true,
//   })
// );

// app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const pineconeClient = new PineconeClient();

async function run(indexName) {
  await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  let index = pineconeClient.Index(indexName);

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
  for (let [index, batch] of texts.entries()) {
    let embeddingID = uuid();

    batch = batch.replace(/\n/g, " ");
    console.log("chunk...", batch);

    // let embedding;
    const embeddings = await getEmbedding(batch).then(
      (result) => result.embedding
    );

    console.log(embeddings);

    const percentage = Math.floor((index / (texts.length - 1)) * 100);

    callback(batch, embeddings, embeddingID, percentage);
  }
};

exports.embedAndUpsert = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (req, res) => {
    cors(req, res, async () => {
      // your function body here - use the provided req and res from cors
      const { chunks, fileID, namespace } = req.body;

      let index = await run(namespace);

      //   const chunks = ["hello", "world"];
      //   const fileID = "1234";

      try {
        let embeddingRefs = [];

        await embedBatch(chunks, async (chunk, embedding, embeddingID) => {
          // console.log("embedding:", embedding);

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
            namespace: namespace,
          };

          embeddingRefs.push(embeddingID);

          await index.upsert({ upsertRequest });
          console.log("done upsert");
        })
          .then(() => {
            res.json({
              response: "success",
              embeddingsUpserted: embeddingRefs,
            });
          })
          .catch((error) => {
            throw new Error("error embedding batch: " + error);
          });
      } catch (error) {
        res.json({ response: "error", errorMessage: error });
      }
    });
  }
);

// exports.currentTimeStream = onRequest((request, response) => {
//   cors(request, response, async () => {
//     // Set response headers to allow streaming
//     response.setHeader("Content-Type", "text/event-stream");
//     response.setHeader("Cache-Control", "no-cache");
//     response.setHeader("Connection", "keep-alive");
//     response.setHeader("Access-Control-Allow-Origin", "*");
//     response.flushHeaders();

//     const sendEventStreamData = (data) => {
//       response.write(`${JSON.stringify(data)}`);
//     };

//     // Set an interval to send updates every second
//     const interval = setInterval(() => {
//       const currentTime = new Date().toLocaleTimeString();
//       const message = { currentTime };

//       sendEventStreamData(message);
//     }, 1000);

//     // End the response after 10 seconds
//     setTimeout(() => {
//       clearInterval(interval);
//       response.end();
//     }, 10000);
//   });
// });

exports.streamedEmbedAndUpsert = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  (req, res) => {
    cors(req, res, async () => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.flushHeaders();

      const sendEventStreamData = (data) => {
        res.write(`${JSON.stringify(data)}\n\n`);
      };

      // your function body here - use the provided req and res from cors
      const { chunks, fileID, namespace, indexName } = req.body;

      let index = await run(indexName);

      console.log(index)

      //   const chunks = ["hello", "world"];
      //   const fileID = "1234";

      try {
        let embeddingRefs = [];

        embedBatch(
          chunks,
          async (chunk, embedding, embeddingID, percentage) => {
            // console.log("embedding:", embedding);

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
              namespace: namespace,
            };

            embeddingRefs.push(embeddingID);

            await index.upsert({ upsertRequest });
            console.log("done upsert: " + percentage + "%");

            sendEventStreamData({ response: "success", percentage });
          }
        )
          .then(() => {
            console.log(embeddingRefs);

            sendEventStreamData({
              response: "success",
              embeddingRefs,
            });
            console.log("ending res");

            // console.log(embeddingRefs);
          })
          .catch((error) => {
            throw new Error("error embedding batch: " + error);
          });
      } catch (error) {
        sendEventStreamData({ response: "error", errorMessage: error });
      }
    });
  }
);

function splitTextIntoChunks(text, chunkSize) {
  const maxChunkLength = chunkSize; // Maximum length for each text chunk
  const words = text.split(" ");
  const chunks = [];

  let currentChunk = "";
  for (const word of words) {
    if ((currentChunk + word).length > maxChunkLength) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += word + " ";
  }

  // Push the remaining text as the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

const fileMiddleware = require("express-multipart-file-parser");
app.use(fileMiddleware);
const mammoth = require("mammoth");

app.post("/", async (req, res) => {
  cors(req, res, async () => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    const sendEventStreamData = (data) => {
      res.write(`${JSON.stringify(data)}\n\n`);
    };

    // your function body here - use the provided req and res from cors
    let index = await run();

    const { namespace } = req.body;

    const { files } = req;
    console.log("namepace: ", namespace);
    try {
      for (let file of files) {
        const fileExtension = file.originalname.split(".").pop();

        // Check the file type and perform specific actions
        if (
          file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fileExtension === "docx"
        ) {
          // Process DOCX files
          console.log("Processing DOCX file");
          // Perform actions specific to DOCX files

          const extractedText = await mammoth.extractRawText({
            buffer: req.files[0].buffer,
          });
          const fileText = extractedText.value;

          let chunks = splitTextIntoChunks(fileText, 256);

          try {
            let embeddingRefs = [];

            embedBatch(
              chunks,
              async (chunk, embedding, embeddingID, percentage) => {
                // console.log("embedding:", embedding);

                const upsertRequest = {
                  vectors: [
                    {
                      id: embeddingID,
                      values: embedding,
                      metadata: {
                        type: "study-notes",
                        originalText: chunk,
                      },
                    },
                  ],
                  namespace: namespace,
                };

                embeddingRefs.push(embeddingID);

                await index.upsert({ upsertRequest });
                console.log("done upsert: " + percentage + "%");

                sendEventStreamData({ response: "success", percentage });
              }
            )
              .then(() => {
                console.log(embeddingRefs);

                sendEventStreamData({
                  response: "success",
                  embeddingRefs,
                });
                console.log("ending res");
                res.end();

                // console.log(embeddingRefs);
              })
              .catch((error) => {
                throw new Error("error embedding batch: " + error);
              });
          } catch (error) {
            sendEventStreamData({ response: "error", errorMessage: error });
            res.end();
          }
        } else if (file.mimetype === "text/plain" || fileExtension === "txt") {
          // Process TXT files
          console.log("Processing TXT file");
          // Perform actions specific to TXT files
          sendEventStreamData({
            message: "successfully ran function. file is txt",
          });
        } else if (
          file.mimetype.startsWith("video/") ||
          ["mp4", "mov", "avi"].includes(fileExtension)
        ) {
          // const response = await openai.createTranscription(file, "whisper-1")

          // console.log(response)
          // Process video files
          console.log("Processing video file");
          // Perform actions specific to video files
          sendEventStreamData({
            message: "successfully ran function. file is video",
          });
        } else {
          // Handle unsupported file types
          console.log("Unsupported file type");
          sendEventStreamData({
            message: "unsupported file type",
          });
          // Perform actions for unsupported file types
        }
      }
    } catch (error) {
      console.error("Error processing files:", error);
      sendEventStreamData({ message: "Error processing files" });
    }
  });
});

exports.handleUpload = onRequest(app);

const pako = require("pako");
const JSZip = require("jszip");
const pdfjsLib = require("pdfjs-dist");

const processPDF = async (pdfBuffer) => {
  const pdfData = new Uint8Array(pdfBuffer);

  try {
    // Load the PDF data
    const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;

    // Initialize an empty string to store the extracted text
    let extractedText = "";

    // Iterate through each page of the PDF
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      // Get the page
      const page = await pdfDocument.getPage(pageNumber);

      // Extract the text content from the page
      const pageText = await page.getTextContent();

      // Combine the text from different items on the page
      const pageTextArray = pageText.items.map((item) => item.str);
      const pageTextString = pageTextArray.join(" ");

      // Append the extracted text to the result
      extractedText += pageTextString + "\n";
    }

    // The extracted text from the entire PDF is now in the 'extractedText' variable
    return extractedText;
  } catch (error) {
    console.error("Error while processing PDF:", error);
    throw error;
  }
};

exports.processCompressedFiles = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
},
async (req, res) => {
  cors(req, res, async () => {
    try {
      // Check if the request method is POST
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      // Ensure the request has 'Content-Encoding' header set to 'gzip'
      // if (req.get("Content-Encoding") !== "gzip") {
      //   console.log("get", req.get("Content-Encoding"));
      //   return res
      //     .status(400)
      //     .send("Bad Request: Expecting gzip-compressed data");
      // }

      // Get the compressed data from the request body
      const compressedData = req.body; // Assuming Firebase Functions v1.0.0 or later
      // console.log(compressedData)

      // Step 1: Decompress the zip file
      const zip = new JSZip();
      const zipFiles = await zip.loadAsync(compressedData);

      const decompressedFiles = [];

      // // Step 2: Decompress each file in the zip
      await Promise.all(
        Object.entries(zipFiles.files).map(async ([fileName, file]) => {
          if (!file.dir) {
            const compressedData = await file.async("uint8array");
            const decompressedData = pako.ungzip(compressedData);

            // Store the decompressed data along with the file name
            decompressedFiles.push({
              name: fileName,
              data: decompressedData,
            });
          }
        })
      );

      console.log(decompressedFiles);

      // Step 3: Process the decompressed files
      // ...
      // You can now use 'decompressedFiles' to process the individual files

      const processedFiles = await Promise.all(
        decompressedFiles.map(async (file) => {
          if (file.name.endsWith(".docx")) {
            // Use Mammoth to read the contents of the DOCX file as text
            const textResult = await mammoth.extractRawText({
              buffer: file.data,
            });

            return {
              name: file.name,
              text: textResult.value, // The extracted text content
            };
          } else if (file.name.endsWith(".pdf")) {

            processPDF(file.data)
            
          } else {
            // Handle other file types as needed
            return {
              name: file.name,
              text: null, // No text content for non-DOCX files
            };
          }
        })
      );

      res.status(200).json(processedFiles);
    } catch (error) {
      console.error("Error occurred during decompression:", error);
      res.status(500).send("Error occurred during decompression.");
    }
  });
});
