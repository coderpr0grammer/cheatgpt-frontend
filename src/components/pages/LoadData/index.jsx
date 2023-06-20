import mammoth from "mammoth";

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

              fetch("https://embeddings-api.vercel.app/api", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ chunks: chunks, fileID: file.name }),
              })
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

              // embedBatch(chunks, async (embeddings) => {
              //   await chunkedUpsert(index.current, embeddings, "default");
              //   console.log("done upsert");
              // });
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
    <div>
      <form className="flex items-center space-x-6">
        <label className="block">
          <span className="sr-only">Choose profile photo</span>
          <input
            type="file"
            className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100"
                    
            onChange={(e) => processDocxFile(e.target.files[0])}
          />
        </label>
      </form>
    </div>
  );
};

export default LoadData;
