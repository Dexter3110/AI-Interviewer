# Isolated coding sandbox runner

The sandbox sends test runs to a self-hosted [Piston](https://github.com/engineer-man/piston) service. Piston uses Isolate inside Docker to compile and run submissions with resource limits and network access disabled.

## Windows setup

1. Start Docker Desktop with its Linux container engine enabled. On Windows, start the Docker Desktop Service as an administrator if it is stopped.
2. From the project root, run `powershell -ExecutionPolicy Bypass -File backend/runner/setup-runner.ps1`.
3. Set `CODE_EXECUTOR_URL=http://127.0.0.1:2000` in `backend/.env` and restart the Node backend.

The setup script starts the runner, downloads Piston's runtime manager, and installs Python, JavaScript/Node, TypeScript, Java, C++, Go, and SQLite runtimes. The first setup downloads language runtimes and may take several minutes. Keep the runner bound to localhost unless you have separately secured its API.

Coding challenges use the generated function entrypoint and each case's JSON `args`/`expected` fields. SQL challenges run against SQLite 3; each case supplies its own `setupSql`, and the candidate's query is run against that fixture. The backend caps each request at 10 cases, 30 KB of source, 10 seconds of compilation, 5 seconds of execution, and fixed memory limits.

The runner is separate from AI review. **Run Test Cases** reports real compiler/runtime output; **Submit Solution** remains a static LLM review and does not claim to have executed code.
