import { useState } from "react";

const MainApp = () => {
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [GPTResponse, setGPTResponse] = useState("");
  const [useGPT, setUseGPT] = useState(true);
  const [GPTResponseLoading, setGPTResponseLoading] = useState(false);

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    window.parent.postMessage({ copyFromCGPT: text }, "*");
  }

  return (
    <div className="p-3 flex flex-col justify-center items-center">
      <form className="mb-2">
        <input
          type="text"
          className={`shadow border mt-6 p-1 rounded-lg bg-transparent `}
          value={inputValue}
          placeholder="question"
          required
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
        />
        <button
          type="submit"
          className={`shadow border rounded-lg text-sm px-3 py-1.5 ml-1 ${
            searchLoading && "text-xs"
          }`}
          // disabled={searchLoading}
          onClick={(e) => {
            e.preventDefault();
            setSearchLoading(true);

            const testURL =
              "http://127.0.0.1:5001/cheatgpt-extesnion/us-central1/cheatgpt_api/query";

            const liveURL =
              "https://cheatgpt-api-wejuqjonkq-uc.a.run.app/query";

            fetch(liveURL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json", // Set the content type to JSON
                // Add any other headers as needed
              },
              body: JSON.stringify({
                query: inputValue,
              }),
            })
              .then((response) => {
                return response.json();
              })
              .then((data) => {
                console.log(data);
                setResults(data.matches);
                setGPTResponse(data.gpt_response);
                setSearchLoading(false);
              })
              .catch((err) => {
                console.error(err);
                alert(err);
                setSearchLoading(false);
              });

            // fetch('http://embeddings-api.vercel.app/api/yt-transcript?videoID=JY_d0vf-rfw')
            // .then((data)=> data.json())
            // .then((result)=> {
            //   console.log(result)
            // })

            // try {
            //   fetch("https://embeddings-api.vercel.app/api/search", {
            //     method: "POST",
            //     headers: {
            //       "Content-Type": "application/json",
            //     },
            //     body: JSON.stringify({
            //       query: inputValue,
            //       topK: 5,
            //       namespace: "study-files-2",
            //     }),
            //   })
            //     .then((data) => data.json())
            //     .then((result) => {
            //       console.log(result.matches);
            //       setResults(result.matches);

            //       if (useGPT) {
            //         setGPTResponseLoading(true);
            //         const { originalText } = result.matches[0].metadata;

            //         fetch("https://embeddings-api.vercel.app/api/search/summarize", {
            //           method: "POST",
            //           headers: {
            //             "Content-Type": "application/json",
            //           },
            //           body: JSON.stringify({ searchResult: originalText }),
            //         })
            //           .then((data) => data.json())
            //           .then((result) => {
            //             console.log(result);
            //             setGPTResponse(result.content);
            //             setGPTResponseLoading(false);
            //           });
            //       }

            //       setSearchLoading(false);
            //     });
            // } catch (e) {
            //   alert(e);
            //   setSearchLoading(false);
            // }
          }}
        >
          {searchLoading ? "searching" : "Search"}
        </button>
        {/* <div className="m-2 mb-0 flex items-center">
          <input
            type="checkbox"
            checked={useGPT}
            onChange={() => setUseGPT(!useGPT)}
          />
          <small className="text-gray-500 text-xs">&nbsp;Get GPT summary</small>
        </div> */}
      </form>

      {GPTResponse ? (
        <div className="rounded-lg p-3 border shadow-md">
          <small className="flex text-gray-500 mb-1">GPT Response</small>
          <button
            className="p-1 rounded-lg border shadow-sm text-xs mr-1"
            onClick={() => copyToClipboard(GPTResponse)}
          >
            Copy
          </button>
          {GPTResponse}
        </div>
      ) : (
        GPTResponseLoading && (
          <div className="rounded-lg p-3 m-2 border shadow-md w-full">
            <p className="text-xs">Getting GPT response...</p>
          </div>
        )
      )}

      {results && results.length > 0 && (
        <>
          <small className="flex text-gray-500 mb-1 mt-4 self-start">
            Search Results (Sources)
          </small>

          {results.map((item, index) => (
            <div key={index} className="rounded-lg p-3 m-2 border shadow-md">
              <small className="flex text-gray-500 mb-3 self-start">
                Source #{index} {item.metadata.file_name}
              </small>
              <button
                className="p-1 rounded-lg border shadow-sm text-xs mr-1"
                onClick={() => copyToClipboard(item.metadata.original_text)}
              >
                Copy
              </button>
              ...{item.metadata.original_text}...
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default MainApp;
