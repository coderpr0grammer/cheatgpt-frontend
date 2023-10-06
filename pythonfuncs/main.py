# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn, options
from firebase_admin import initialize_app
from flask_cors import CORS, cross_origin
from flask import Flask, Response, request, jsonify
from functions_wrapper import entrypoint
from dotenv import load_dotenv
import fitz
import openai
import os
import uuid
import itertools
import pinecone
import json

initialize_app()

app = Flask(__name__)

load_dotenv()

CORS(app, origins="*")

openai.api_key = os.getenv("OPENAI_API_KEY")


system_prompt = """

Please provide a comprehensive response to the following question, drawing on the relevant material from the audiocasts, notes, readings, and videos, and ensuring proper APA citations with in-text citations:

Cite the relevant information from the provided sources using APA style, including in-text citations.

Ensure that your response is informed by the materials provided in the specified sources. Your response must be detailed and well-written.

"""


def split_text_into_chunks(text, chunk_size=200):
    """
    Split a long text into chunks of approximately the given size (in words).
    """
    words = text.split()
    chunks = []
    current_chunk = []

    for word in words:
        current_chunk.append(word)

        if len(current_chunk) >= chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def extract_text(pdf_data):
    doc = fitz.Document(stream=pdf_data, filetype="pdf")
    text = ""
    
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        text += page.get_text()
    
    return text

def embed_text(text):
    openai.api_key = os.getenv("OPENAI_API_KEY")
    
    try:
        response = openai.Embedding.create(
            input=text,
            model="text-embedding-ada-002"
        )

        embeddings = response['data']
        return embeddings
    # Your code to handle the response goes here
    except Exception as e:
        # Handle the exception here, e.g., print an error message
        print(f"An error occurred: {str(e)}")

def batch_vectors(iterable, batch_size=100):
    """A helper function to break an iterable into chunks of size batch_size."""
    it = iter(iterable)
    chunk = tuple(itertools.islice(it, batch_size))
    while chunk:
        yield chunk
        chunk = tuple(itertools.islice(it, batch_size))

def process_match(index, item):
        # Replace this with your specific processing logic
        return f'Search Result {index}: {item["metadata"]["original_text"]}'
    

@app.route("/process_pdf", methods={"POST", "GET"})
@cross_origin(methods=["POST", "GET"])
def process_pdf():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file:
        pdf_data = file.read()  # Read the uploaded PDF file into memory
        text = extract_text(pdf_data)

        chunks = split_text_into_chunks(text)

        embeddings = embed_text(chunks)
        # print(embeddings)


        vectorsToUpsert = []

        for index, chunk in enumerate(chunks):
            vectorObject = {
                'id': str(uuid.uuid4()), 
                'values': embeddings[index]["embedding"], 
                'metadata': {
                    "file_name": file.filename,
                    "original_text": chunk,
                }
            }
            vectorsToUpsert.append(vectorObject)

        PINEONE_KEY=os.getenv("PINECONE_API_KEY")

        pinecone.init(api_key=PINEONE_KEY, environment="us-west4-gcp-free")


        with pinecone.Index('cheatgpt-files', pool_threads=30) as index:
            # Send requests in parallel
            async_results = [
                index.upsert(vectors=batch, async_req=True, namespace="musa")
                for batch in batch_vectors(vectorsToUpsert, batch_size=100)
            ]
            # Wait for and retrieve responses (this raises in case of error)
            print([async_result.get() for async_result in async_results])

        return jsonify({"text": chunks, "length": len(chunks), "embeddings": len(embeddings)})
    

    
@app.route("/delete_vectors", methods={"POST", "GET"})
@cross_origin(methods=["POST", "GET"])
def delete_vectors():
    PINEONE_KEY=os.getenv("PINECONE_API_KEY")

    pinecone.init(api_key=PINEONE_KEY, environment="us-west4-gcp-free")
    index = pinecone.Index("cheatgpt-files")
    delete_response = index.delete(namespace="musa", delete_all=True)

    return { "delete_resopnse": delete_response}

@app.route("/query", methods={"POST", "GET"})
@cross_origin(methods=["POST", "GET"])
def query():
    query = request.json["query"]
    PINEONE_KEY=os.getenv("PINECONE_API_KEY")
    pinecone.init(api_key=PINEONE_KEY, environment="us-west4-gcp-free")
    index = pinecone.Index("cheatgpt-files")

    queryVec = embed_text(query)

    query_response = index.query(
        namespace="musa",
        top_k=3,
        include_metadata=True,
        vector=queryVec[0]["embedding"]
    ).to_dict()

    matches = query_response["matches"]

    # print(query_response)

    processed_matches = [process_match(index, match) for index, match in enumerate(matches)]

    gpt_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Search Query: {query}. Search Results: {processed_matches}"},
        ]

    gpt_response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=gpt_messages
    )['choices'][0]['message']['content']

    response_data = {
            "matches": matches,
            "gpt_response": gpt_response,
            "gpt_messages": gpt_messages
    }

    return jsonify(response_data)


#ENTRYPOINT FLASK APP
@https_fn.on_request(timeout_sec=300, memory=options.MemoryOption.GB_1)
def cheatgpt_api(request):
    return entrypoint(app, request)
#
#
# @https_fn.on_request()
# def on_request_example(req: https_fn.Request) -> https_fn.Response:
#     return https_fn.Response("Hello world!")