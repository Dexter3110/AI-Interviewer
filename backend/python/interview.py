import os
import tempfile

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = Flask(__name__)


# ============================================================
# LAZY-LOADED AI AGENTS
# ============================================================
#
# IMPORTANT:
# Do NOT import the normal/coding agents at startup.
#
# The normal RAG agent can load SentenceTransformer and other
# dependencies, which can take several seconds.
#
# Flask should start first on port 5100.
# The agents are loaded only when they are actually needed.
# ============================================================

eval_verbal = None

eval_code = None


def load_verbal_agent():
    global eval_verbal

    if eval_verbal is None:
        print("Loading normal-question RAG agent...", flush=True)

        from normal_questions_agent import evaluate

        eval_verbal = evaluate

        print(
            "Normal-question RAG agent loaded.",
            flush=True
        )

    return eval_verbal


def load_coding_agent():
    global eval_code

    if eval_code is None:
        print("Loading coding/SQL agent...", flush=True)

        from coding_sql_agent import evaluate

        eval_code = evaluate

        print(
            "Coding/SQL agent loaded.",
            flush=True
        )

    return eval_code


# ============================================================
# TRANSCRIPTION
# ============================================================

def transcribe_file(file_storage):
    key = os.getenv(
        "GROQ_API_KEY"
    )

    if not key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured"
        )

    suffix = (
        os.path.splitext(
            file_storage.filename or "answer.webm"
        )[1]
        or ".webm"
    )

    fd, path = tempfile.mkstemp(
        suffix=suffix
    )

    os.close(fd)

    try:
        file_storage.save(path)

        with open(
            path,
            "rb"
        ) as f:

            result = Groq(
                api_key=key
            ).audio.transcriptions.create(
                file=(
                    os.path.basename(path),
                    f
                ),
                model="whisper-large-v3-turbo",
                language="en",
                response_format="json",
            )

        return result.text

    finally:
        try:
            os.remove(path)
        except OSError:
            pass


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return jsonify({
        "ok": True,
        "service": "interview-agent",
    })


# ============================================================
# TRANSCRIBE
# ============================================================

@app.post("/transcribe")
def transcribe():
    try:
        if "audio" not in request.files:
            return jsonify({
                "message": "audio is required"
            }), 400

        text = transcribe_file(
            request.files["audio"]
        )

        return jsonify({
            "text": text
        })

    except Exception as e:
        print(
            "Transcription error:",
            e,
            flush=True
        )

        return jsonify({
            "message": str(e)
        }), 500


# ============================================================
# EVALUATE ANSWER
# ============================================================

@app.post("/evaluate")
def evaluate():
    try:
        p = request.get_json(
            force=True
        )

        section = p.get(
            "section",
            "verbal"
        )

        # ----------------------------------------------------
        # CODING / SQL EVALUATION
        # ----------------------------------------------------

        if section in (
            "coding",
            "sql"
        ):

            eval_code_fn = load_coding_agent()

            result = eval_code_fn(
                p
            )

        # ----------------------------------------------------
        # NORMAL / VERBAL EVALUATION
        # ----------------------------------------------------

        else:

            eval_verbal_fn = load_verbal_agent()

            result = eval_verbal_fn(
                p
            )

        return jsonify({
            "evaluation": result,

            "score": result.get(
                "score",
                0
            ),

            "followUp": result.get(
                "followUp",
                False
            ),

            "endInterview": result.get(
                "endInterview",
                False
            ),

            "summary": result.get(
                "summary"
            ),
        })

    except Exception as e:
        print(
            "Answer evaluation error:",
            e,
            flush=True
        )

        return jsonify({
            "message": str(e)
        }), 500


# ============================================================
# START FLASK SERVER
# ============================================================


# ============================================================
# BATCH GENERATE QUESTION BANK
# ============================================================

@app.post("/generate-bank")
def generate_bank():
    try:
        p = request.get_json(force=True) or {}
        setup = p.get("setup", {})
        plan = p.get("plan", {})

        from bank_generator import generate_question_bank
        questions = generate_question_bank(setup, plan)

        return jsonify({
            "ok": True,
            "questions": questions,
            "count": len(questions)
        })
    except Exception as e:
        print("Generate question bank error:", e, flush=True)
        return jsonify({
            "ok": False,
            "message": str(e),
            "questions": []
        }), 500


if __name__ == "__main__":

    port = int(
        os.getenv(
            "INTERVIEW_AGENT_PORT",
            "5100"
        )
    )

    print(
        "",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )

    print(
        "       VIVA AI INTERVIEW AGENT",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )

    print(
        f"Starting Flask on port {port}...",
        flush=True
    )

    print(
        "AI agents will load on first request.",
        flush=True
    )

    print(
        "========================================",
        flush=True
    )

    app.run(
        host="127.0.0.1",
        port=port,
        debug=False,
        threaded=True,
    )
