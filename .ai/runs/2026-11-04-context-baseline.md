# Pomiar bazowy kontekstu — 2026-11-04

Zlecenie: zmierzyć i zapisać stan wejściowy przed zmianami.

Pomiar dotyczy pierwszego żądania tej sesji. Odczytano jego historyczną telemetrię,
wstrzyknięty katalog skilli i metadane udostępnionych narzędzi. Nie zmieniono
AGENTS.md, skilli, konfiguracji MCP ani kodu projektu. Stan Git przed zapisem był
czysty. Jedynym utworzonym plikiem jest ten lokalny raport; pozostaje poza commitami.

| Wielkość | Wynik |
| --- | --- |
| Zajętość przed pierwszym promptem użytkownika | Niedostępna: brak pomiaru sprzed promptu |
| Wejście pierwszego żądania, już z promptem użytkownika | 23 284 tokeny |
| Okno kontekstu podane przez telemetrię | 475 000 tokenów |
| Udział pierwszego wejścia w oknie | 4,901895% |
| Tokeny wejścia z cache, zawarte w 23 284 | 12 032 |
| AGENTS.md na dysku | 23 560 B UTF-8; 23 424 znaki; 391 linii |
| Liczba skilli w początkowym katalogu | 43 |
| Suma samych opisów skilli | 14 757 B UTF-8; 14 695 znaków |
| Katalog skilli z nazwami i ścieżkami, LF między wpisami | 17 266 B UTF-8; 17 204 znaki |
| Cały początkowy blok instrukcji skilli | 17 778 B UTF-8; 17 716 znaków |
| Serwery MCP udostępniające narzędzia | 1: codex_tui |
| Udostępnione narzędzia MCP | 12 |
| Opisy MCP wraz z osadzonymi deklaracjami | 4 503 B UTF-8; 4 503 znaki |
| JSON nazw i opisów MCP z interfejsu ALL_TOOLS | 5 308 B UTF-8 |
| Faktyczny narzut MCP w tokenach wejściowych | Niedostępny: brak rozbicia telemetrii |
| Całkowita liczba skonfigurowanych i włączonych serwerów MCP | Niedostępna; potwierdzono 1 udostępniający narzędzia |

Nie przeliczano znaków na tokeny szacunkowym współczynnikiem. Rozmiar opisów nie
jest rozmiarem pełnej, wewnętrznej reprezentacji narzędzi wysyłanej do modelu.
Zerowa liczba wywołań MCP przed pierwszym żądaniem nie oznacza zerowego narzutu
definicji narzędzi. Całe pliki SKILL.md nie są tym samym co opisy w katalogu.
Późniejszy odczyt skilla OpenAI Docs i wyniki narzędzi nie wchodzą do tego pomiaru.

Dokładne rozdzielenie tokenów wymagałoby telemetrii klienta/provider'a albo
porównania pierwszych żądań w kontrolowanych sesjach z identycznym promptem
przy włączonym i wyłączonym MCP. Tego eksperymentu ani zmian konfiguracji nie wykonano.

Źródło telemetrii: lokalny log bieżącego wątku, pierwszy event token_count;
ścieżka: `/home/mercato-sandboxes/.mercato-agent/codex/sessions/2026/11/04/rollout-2026-11-04T16-38-18-01a1a76c-f4c3-73b3-b200-81d1599e8c79.jsonl`.

Dane do porównań:

```json
{
  "measurement_scope": "Initial request of this session, before project/configuration changes; not the current expanded context.",
  "first_request_usage_timestamp_utc": "2026-11-04T16:40:10.560Z",
  "first_request_input_tokens": 23284,
  "first_request_cached_input_tokens": 12032,
  "model_context_window_tokens": 475000,
  "first_request_context_usage_percent": 4.901895,
  "context_tokens_before_first_user_prompt": null,
  "context_before_first_prompt_reason": "No telemetry event exists before the first user prompt. First request input includes that prompt; it must not be presented as a pre-prompt measurement.",
  "first_user_prompt_chars": 236,
  "first_user_prompt_utf8_bytes": 248,
  "agents_md": {
    "path": "/workspace/AGENTS.md",
    "utf8_bytes": 23560,
    "chars": 23424,
    "lines": 391,
    "sha256": "6a54432fa2f0d21895fa2cf8f2c24c6049b1e1ae8d1998f5209fcfa72b57fa6b",
    "mtime_utc": "2026-11-03T10:30:56.437324+00:00",
    "injected_message_chars_with_wrapper": 23496,
    "injected_message_utf8_bytes_with_wrapper": 23632
  },
  "skills": {
    "count": 43,
    "description_chars": 14695,
    "description_utf8_bytes": 14757,
    "catalog_chars": 17204,
    "catalog_utf8_bytes": 17266,
    "instructions_chars": 17716,
    "instructions_utf8_bytes": 17778
  },
  "mcp": {
    "exposed_servers_count": 1,
    "server_names": [
      "codex_tui"
    ],
    "exposed_tools_count": 12,
    "description_and_embedded_declaration_chars": 4503,
    "description_and_embedded_declaration_utf8_bytes": 4503,
    "tool_names_and_descriptions_compact_json_utf8_bytes": 5308,
    "actual_schema_input_tokens": null,
    "actual_schema_input_tokens_reason": "First-request telemetry reports aggregate input usage only, without per-tool or per-server token attribution. No provider tokenizer or serialized model-side tool representation is exposed. Byte counts are not token counts.",
    "configured_enabled_servers_total": null,
    "configured_enabled_servers_total_reason": "One server exposes MCP tools. User config.toml contains no mcp_servers entries; host-injected configuration and servers exposing no tools are not enumerable from the available interface.",
    "mcp_tool_calls_before_initial_request": 0
  },
  "initial_worktree_status": "clean",
  "project_or_configuration_changes_before_measurement": false
}
```

Wynik: zapisano bazę dostępną do rzetelnego porównania, z jawnymi brakami pomiaru.
Pliki dotknięte: wyłącznie `.ai/runs/2026-11-04-context-baseline.md`.
Dalsze kroki: brak zmian konfiguracji; niedostępne metryki pozostawiono jako null.
