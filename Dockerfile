FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=3001
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home appuser
COPY --from=build --chown=appuser:appuser /app/dist ./dist
COPY --chown=appuser:appuser server ./server
COPY --chown=appuser:appuser scripts ./scripts
COPY --chown=appuser:appuser data/snapshot.json ./data/snapshot.json
USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3001/api/health',timeout=4)"
CMD ["python", "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "3001"]
