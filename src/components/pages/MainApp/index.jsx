import { useState } from "react";
const MainApp = () => {
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);

  return (
    <div>
      <form>
        <input
          type="text"
          placeholder="question"
          style={{
            background: "transparent",
            border: "0 0 0.5px solid gray 0",
          }}
        />
        <button
          style={{ background: "transparent", border: "1px solid gray" }}
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            setSearchLoading(true);

            fetch(
              "http://embeddings-api.vercel.app/api/yt-transcript?videoID=JY_d0vf-rfw"
            )
              .then((data) => data.json())
              .then((result) => {
                console.log(result);
              });
            try {
              const request = fetch(
                "https://embeddings-api.vercel.app/api/search",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ query: inputValue, topK: 5 }),
                }
              )
                .then((data) => data.json())
                .then((result) => {
                  console.log(result.matches);
                  setResults(result.matches);
                  setSearchLoading(false);

                  
                });
            } catch (e) {
              alert(e);
              setSearchLoading(false);
            }
          }}
        >
          Ask
        </button>
      </form>
    </div>
  );
};

export default MainApp;
