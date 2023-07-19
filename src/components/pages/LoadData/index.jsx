import { useState, useContext } from "react";
import mammoth from "mammoth";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "../../../utils/firebaseConfig";
import { AuthenticationContext } from "../../../infrastructure/authentication/authentication.context";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import pako from "pako";
import JSZip from "jszip";

const LoadData = () => {
  const [progresses, setProgresses] = useState([]);
  const [dragging, setDragging] = useState(false);

  const { user, uid } = useContext(AuthenticationContext);

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

  const createCompressedPackage = (fileDataArray) => {
    const zip = new JSZip();

    fileDataArray.forEach(({ data, name }) => {
      // Compress the file using gzip algorithm
      const compressedData = pako.gzip(data);

      // Add the compressed file to the zip package
      zip.file(name, compressedData);
    });

    // Generate the zip package asynchronously and return as a Blob
    return new Promise((resolve) => {
      zip.generateAsync({ type: "blob" }).then((compressedPackage) => {
        resolve(compressedPackage);
      });
    });
  };

  const compressFiles = (files) => {
    return new Promise((resolve, reject) => {
      const readerPromises = [];

      // Read each file and create an array of promises
      files.forEach((file) => {
        const reader = new FileReader();

        const promise = new Promise((resolve, reject) => {
          reader.onload = (event) => {
            const fileData = new Uint8Array(event.target.result);

            resolve({ data: fileData, name: file.name });
          };

          reader.onerror = (event) => {
            reject(event.target.error);
          };

          reader.readAsArrayBuffer(file);
        });

        readerPromises.push(promise);
      });

      // Wait for all promises to resolve
      Promise.all(readerPromises)
        .then((fileDataArray) => {
          // Create a compressed package using gzip algorithm
          const compressedPackage = createCompressedPackage(fileDataArray);

          resolve(compressedPackage);
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

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

              const url =
                "https://streamedembedandupsert-wejuqjonkq-uc.a.run.app";

              fetch(url, {
                method: "POST",
                cache: "no-cache",
                keepalive: true,
                headers: {
                  "Content-Type": "application/json",
                  Accept: "text/event-stream",
                },
                body: JSON.stringify({
                  chunks: chunks,
                  fileID: file.name,
                  namespace: "study-files-2",
                  indexName: "study-files-2"
                }),
              }).then(async (response) => {
                const reader = response.body.getReader();

                while (true) {
                  const { value, done } = await reader.read();

                  if (done) break;

                  const decodedValue = JSON.parse(
                    new TextDecoder().decode(value)
                  );

                  console.log(decodedValue);

                  // const ;

                  if (decodedValue.percentage) {
                    // setProgress(decodedValue.percentage);
                    // console.log(progress);
                  }
                }
              })
              .catch((err)=> {
                console.log("error fetching api: ", err)
              })

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

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFiles(files);
    setDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleFiles = async (files) => {
    const filesArray = [...files];
    console.log(filesArray);
    const compressedPackage = await compressFiles(filesArray);
    console.log(compressedPackage);


    for (let file of filesArray) {
      console.log(file)
      processDocxFile(file)
    }

    // const url =
    //   "https://processcompressedfiles-wejuqjonkq-uc.a.run.app";
    // fetch(url, {
    //   method: "POST",
    //   body: compressedPackage,
    //   // headers: {
    //   //   "Content-Encoding": "gzip", // Indicate the compressed data format
    //   // },
    // })
    // .then((res)=> res.json())
    // .then((response) => {
    //   console.log(response)
    // })

    
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDragEnter = () => {
    setDragging(true);
  };

  return (
    <section
      className="flex flex-col console"
      style={{ maxHeight: "100vh" }}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {dragging && (
        <div className="absolute bg-purple-300 bg-opacity-50 w-screen h-screen z-20 flex justify-center items-center">
          <FontAwesomeIcon
            icon={faCloudArrowUp}
            style={{ height: 100 }}
            color="#b990f9"
          />
        </div>
      )}
      <div className="flex-grow">
        <div className="h-screen flex justify-center items-center">
          <div
            className="flex h-full relative w-full"
            style={{ maxHeight: "100vh", overflowY: "hidden" }}
          >
            <main
              className="flex items-center w-full justify-center "
              style={{ overflowY: "hidden" }}
            >
              <form className="flex flex-col items-center justify-center">
                <h1>Upload your study sheet</h1>
                {/* {
                  <div className="flex w-full bg-gray-200 rounded-full overflow-hidden h-4 mt-2">
                    <div
                      className="flex flex-col justify-center overflow-hidden bg-blue-500 text-xs text-white text-center"
                      role="progressbar"
                      style={{
                        width: `${progress}%`,
                        transition: "width 0.3s",
                      }}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {progress}%
                    </div>
                  </div>
                } */}
                <label className="block">
                  <span className="sr-only">Choose files</span>
                  <input
                    type="file"
                    className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100 mt-6"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
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
