import mammoth from "mammoth";
import { getFunctions, httpsCallable } from "firebase/functions";

const LoadData = () => {
  function splitTextIntoChunks(text, chunkSize = 128) {
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

  function sentencesChunking(text, chunkSize = 256) {
    const sentences = text.split("."); // Split text into sentences
    const chunks = [];
    let currentChunk = "";

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();

      if (currentChunk.length + sentence.length <= chunkSize) {
        currentChunk += sentence + ". ";
      } else {
        chunks.push(currentChunk);
        currentChunk = sentence + ".";
      }
    }

    // Add the last incomplete chunk if any
    if (currentChunk !== "") {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  function processDocxFile(file) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const arrayBuffer = event.target.result;

      mammoth
        .extractRawText({ arrayBuffer: arrayBuffer })
        .then((result) => {
          const text = result.value; // Extracted text content from the .docx file
          console.log("Text content:", text);

          mammoth
            .convertToHtml({ arrayBuffer: arrayBuffer })
            .then((result) => {
              const html = result.value; // Converted HTML from the .docx file
              // console.log("Converted HTML:", html);

              // Parse the HTML to identify titles and other formatting
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const titles = doc.querySelectorAll("h1, h2, h3"); // Example: selecting title tags

              titles.forEach((title) => {
                console.log("Title:", title.textContent);
              });

              // Split the text content into chunks
              const chunks = splitTextIntoChunks(text, 256);
              const chunks2 = sentencesChunking(text, 256);

              // const testChunks = ['hello world', 'this is a text chunk']

              console.log(chunks);

            //   const functions = getFunctions();
            //   const embedAndUpsert = httpsCallable(functions, "embedAndUpsert");
            //   console.log(functions)
            //   embedAndUpsert({ chunks: chunks, fileID: file.name })
            //     .then((response) => {
            //         console.log(response)
            //       if (response.ok) {
            //         // Request successful
            //         console.log(response)
            //         return response.json();
            //       }
            //       throw new Error("Error: " + response.status);
            //     })


                // .then((data) => {
                //   console.log(data);
                // })
                // .catch((error) => {
                //   console.error("Error:", error);
                // });

              fetch(
                "https://embedandupsert-wejuqjonkq-uc.a.run.app",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ chunks: chunks, fileID: file.name }),
                }
              )
                .then((response) => {
                  if (response.ok) {
                    // Request successful
                    return response.json();
                  }
                  throw new Error("Error: " + response.status);
                })
                .then((data) => {
                  console.log(data);
                })
                .catch((error) => {
                  console.error("Error:", error);
                });

            //   embedBatch(chunks, async (embeddings) => {
            //     await chunkedUpsert(index.current, embeddings, "default");
            //     console.log("done upsert");
            //   });
            })
            .catch((error) => {
              console.error("Error converting to HTML:", error);
            });
        })
        .catch((error) => {
          console.error("Error extracting text:", error);
        });
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <section className="flex flex-col console" style={{ maxHeight: "100vh" }}>
      <div className="flex-grow">
        <div className="h-screen flex justify-center items-center">
          <div
            className="flex h-full relative"
            style={{ maxHeight: "100vh", overflowY: "hidden" }}
          >
            <main className="flex items-center" style={{ overflowY: "hidden" }}>
              <form className="flex flex-col items-center space-x-6">
                <h1>Upload your study sheet</h1>

                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    type="file"
                    className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100 mt-6"
                    onChange={(e) => processDocxFile(e.target.files[0])}
                  />
                </label>
              </form>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoadData;
