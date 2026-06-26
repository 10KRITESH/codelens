CREATE TABLE IF NOT EXISTS code_chunks (
    id SERIAL PRIMARY KEY,
    repo_url TEXT NOT NULL,
    path TEXT NOT NULL,
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768)
);


