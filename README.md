# LOOGI Prompt Supercharger

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://docker.com/) [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js)](https://nodejs.org/) [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)

LOOGI Prompt Supercharger is a self-hosted tool that uses an AI model to refine your prompts, making them more specific and effective. It runs in Docker and provides a simple web interface and API.

You can test it here: [https://prompt.loogi.ch](https://prompt.loogi.ch)

![LOOGI Prompt Supercharger Demo](./docs/assets/loogi-demo.gif)

## Table of Contents

- [Why I Built This](#why-i-built-this)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Design Decisions](#design-decisions)
- [Limitations & Roadmap](#limitations--roadmap)
- [Development & Testing](#development--testing)
- [Contributing](#contributing)
- [License](#license)

## Why I Built This

I built this project to solve a common problem I faced: getting consistent, structured, and predictable results from large language models. The core idea is to wrap prompts with a "contract" — a set of rules and validations. If the AI\'s output doesn\'t meet the contract, the system automatically retries with a refined request until the output is valid. This tool is the result of that exploration, providing a reliable way to supercharge simple ideas into high-quality, model-ready prompts.

## Quick Start

This project runs in Docker. You\'ll need Docker and Docker Compose installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/psimaker/LOOGI-Prompt-Supercharger.git
    cd LOOGI-Prompt-Supercharger
    ```

2.  **Configure your environment:**
    Copy the example environment file and add your AI provider\'s API key.
    ```bash
    cp .env.example .env
    nano .env # Or use your favorite editor
    ```
    You only need to set `AI_API_KEY`. The other variables have sensible defaults.

3.  **Build and run the services:**
    This command starts the frontend and backend in the background. 
    ```bash
    docker compose up --build -d
    ```
    The initial build may take a few minutes.

4.  **Access the application:**
    -   **Web UI**: [http://localhost:3010](http://localhost:3010)
    -   **Backend API**: `http://localhost:3011`
    -   **API Health Check**: `http://localhost:3011/api/health`

    *The default ports (3010 and 3011) can be changed in the `.env` file.*

## Configuration

All configuration is managed in the `.env` file.

| Variable                  | Description                                                                                             | Default                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `DOCKER_FRONTEND_PORT`    | External port for the web UI.                                                                           | `3010`                          |
| `DOCKER_BACKEND_PORT`     | External port for the backend API.                                                                      | `3011`                          |
| `AI_API_KEY`              | **Required.** Your API key for the AI service (e.g., DeepSeek, OpenAI).                                 | `your-api-key-here`             |
| `AI_API_URL`              | The base URL of the AI provider\'s API.                                                                 | `https://api.deepseek.com/v1`   |
| `AI_MODEL`                | The model to use for enhancement.                                                                       | `deepseek-chat`                 |
| `AI_MAX_TOKENS`           | Maximum tokens for the generated response.                                                              | `3000`                          |
| `AI_TEMPERATURE`          | Controls randomness (0.0 to 2.0). Lower is more deterministic.                                          | `0.2`                           |
| `AI_SEED`                 | A seed for the AI model to encourage deterministic outputs.                                             | `42`                            |
| `CONTRACT_MAX_ATTEMPTS`   | Number of times to retry if the AI output fails validation.                                             | `2`                             |
| `CONTRACT_ENABLE_RETRY`   | Set to `true` to enable the contract-based retry mechanism.                                             | `true`                          |
| `LOG_AI_REQUESTS`         | Set to `true` to enable detailed logging of AI requests and responses.                                  | `false`                         |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum number of API requests allowed per minute.                                                      | `10`                            |

To change ports, edit `DOCKER_FRONTEND_PORT` and `DOCKER_BACKEND_PORT`, then restart the services:
```bash
docker compose down && docker compose up --build -d
```

## Usage

### Web Interface

Navigate to [http://localhost:3010](http://localhost:3010).
1.  Enter your base prompt into the input field.
2.  Select an enhancement mode (e.g., Standard, Creative, Technical).
3.  Click "Supercharge".
4.  The refined, model-ready prompt appears below.

### API

The backend provides a simple REST API. For full details, see the [API Documentation](./docs/API.md).

**Example: Enhance a prompt via `curl`**
```bash
curl -X POST http://localhost:3011/api/enhance \
  -H "Content-Type: application/json" \
  -d \'{ 
    "prompt": "Explain quantum computing in simple terms.",
    "mode": "technical"
  }\'
```

## Architecture

The application is a standard client-server model:
-   **Frontend**: A React/TypeScript single-page application that provides the user interface. It is served by Nginx in the production Docker container.
-   **Backend**: A Node.js/Express API written in TypeScript. It handles prompt validation, interacts with the external AI service, and enforces the output contract.

The two services run in separate Docker containers and are orchestrated by `docker-compose.yml`.

## Design Decisions

-   **Docker-First:** The project is containerized to ensure a consistent and easy setup process, avoiding "it works on my machine" issues.
-   **Separate Frontend/Backend:** This separation allows for independent development, scaling, and deployment. The frontend is a pure static build served by Nginx, while the backend is a stateful Node.js application.
-   **Contract Enforcement:** The core logic for retrying and validating AI outputs is encapsulated in the backend. This makes the system more robust against flaky or non-compliant responses from the LLM.
-   **Apache 2.0 License:** I chose the [Apache License 2.0](https://opensource.org/licenses/Apache-2.0) because this is a personal project I want to share openly for both commercial and non-commercial use.

## Limitations & Roadmap

This is a personal project and has some limitations:

-   **No User Accounts or History:** The application is stateless. There is no database, and prompts are not saved.
-   **Limited Error Recovery:** While the contract system handles AI output errors, other network or service failures are not yet handled gracefully.

Future ideas include:
-   [ ] Adding a persistent database to store prompt history.
-   [ ] Introducing user accounts and authentication.
-   [ ] Building a more comprehensive test suite, including integration tests.
-   [ ] Supporting more AI providers and models.
-   [ ] Expanding the available enhancement modes and task types.

## Development & Testing

To work on the project locally, you can run the services and tests directly.

### Running Tests

The frontend and backend have their own test suites.

**Run backend tests:**
```bash
cd src/backend
npm install
npm test
```

**Run frontend tests:**
```bash
cd src/frontend
npm install
npm test
```

### Linting and Formatting

The project uses ESLint for linting and Prettier for formatting.

```bash
# Lint the backend
cd src/backend && npm run lint

# Lint the frontend
cd src/frontend && npm run lint

# Format all files
cd src/backend && npm run format
cd src/frontend && npm run format
```

## Contributing

This is a personal project, but I\'m open to feedback and contributions. If you have an idea or find a bug, please open an issue. For details on how to contribute, see the [Mode Customization Guide](./docs/MODUS_CUSTOMIZATION_GUIDE.md).

## License

This project is licensed under the [Apache License 2.0](./LICENSE). It is free for personal, educational, and non-commercial use. For commercial licensing, please contact the repository owner.