# HUBSS - Indice File SQL

## Ordine di Esecuzione

Eseguire i file in questo ordine nel SQL Editor di Supabase:

### 1. Schema Base (Migration Files)

| # | File | Descrizione | Cosa fa |
|---|------|-------------|---------|
| 1 | `migrations/001_initial_schema.sql` | Schema DB | Crea 11 ENUM, 24 tabelle, 40+ indici |
| 2 | `migrations/002_rls_policies.sql` | RLS + Helper | Abilita RLS su tutte le tabelle, crea 6 funzioni helper SECURITY DEFINER, 80+ policy |
| 3 | `migrations/003_triggers.sql` | Trigger + Utility | 18 funzioni trigger (auto-timestamp, audit, notifiche, time tracking), 4 funzioni utility (get_current_workspace, get_running_time_log, etc.) |
| 4 | `migrations/004_storage.sql` | Storage | 5 bucket (avatars, workspace-logos, task-attachments, client-files, chat-attachments), 18 policy storage |
| 5 | `migrations/005_seed_data.sql` | Seed + Setup | 22 permessi default, funzioni setup workspace (create_default_roles, create_default_channels, setup_new_workspace), config Realtime |

### 2. Fix Definitivo

| # | File | Descrizione | Cosa fa |
|---|------|-------------|---------|
| 6 | **`FIX_DEFINITIVE.sql`** | **FIX FINALE** | Risolve TUTTI i warning: SET search_path su 23 funzioni SECURITY DEFINER, fix policy notifications INSERT, aggiunge policy audit_logs INSERT |

### 3. File Consolidato (Alternativa)

| File | Descrizione |
|------|-------------|
| `COMPLETE_MIGRATION.sql` | Versione unificata di tutti i file 001-005. Usare SOLO se si parte da zero (DB vuoto). Dopo l'esecuzione, applicare comunque `FIX_DEFINITIVE.sql` |

---

## File da NON Eseguire (Deprecati)

Questi file contengono errori o regressioni di sicurezza e sono stati sostituiti da `FIX_DEFINITIVE.sql`:

| File | Motivo | Rischio |
|------|--------|---------|
| `FIX_WARNINGS.sql` | Firme funzione errate (setup_new_workspace UUID,UUID invece di VARCHAR,VARCHAR) | Le ALTER non vengono applicate |
| `FIX_ALL_WARNINGS.sql` | Stessi errori di firma + funzioni mancanti | Le ALTER non vengono applicate |
| `FIX_WARNINGS_V2.sql` | Firma errata setup_new_workspace | Le ALTER non vengono applicate |
| `FIX_FINAL_7.sql` | Firme errate su 2 funzioni | Parzialmente applicato |
| `FIX_FINAL_8.sql` | Firme corrette ma copre solo 8 funzioni su 23 | Parziale - sostituito da FIX_DEFINITIVE |
| `FIX_RLS_PERFORMANCE.sql` | **PERICOLOSO** - Riscrive tutte le RLS eliminando le funzioni helper, semplifica eccessivamente la logica di sicurezza | **REGRESSIONE DI SICUREZZA** |
| `FIX_RLS_PERFORMANCE_V2.sql` | **PERICOLOSO** - Come sopra, leggermente migliorato ma comunque rompe il modello di sicurezza | **REGRESSIONE DI SICUREZZA** |

---

## Mappa delle Tabelle

### Core
- `workspaces` - Workspace dell'agenzia
- `profiles` - Profili utente (legato a auth.users)
- `workspace_members` - Membri del workspace (junction)
- `roles` - Ruoli personalizzabili per workspace
- `permissions` - Permessi sistema (22 seed)

### Progetti
- `boards` - Board Kanban
- `board_members` - Membri per board (junction)
- `tasks` - Task nei board
- `task_assignees` - Assegnazioni task (junction)
- `task_attachments` - File allegati ai task
- `task_comments` - Commenti sui task
- `time_logs` - Log di tempo (timer + manuale)

### Clienti
- `clients` - Clienti dell'agenzia
- `user_client_access` - Accesso utente-cliente (junction)
- `milestones` - Milestone per cliente
- `tickets` - Ticket supporto
- `client_files` - File caricati per cliente

### Chat
- `channels` - Canali (channel/dm/ai)
- `channel_members` - Membri canale (junction)
- `messages` - Messaggi chat
- `message_reads` - Stato lettura messaggi

### Altro
- `documents` - Documenti/wiki (stile Notion)
- `notifications` - Notifiche utente
- `integrations` - Integrazioni OAuth (Google, etc.)
- `calls` - Chiamate audio/video
- `call_participants` - Partecipanti chiamata
- `audit_logs` - Log di audit

---

## Funzioni SECURITY DEFINER (23 totali)

Tutte queste funzioni hanno `SET search_path` dopo l'applicazione di `FIX_DEFINITIVE.sql`:

### RLS Helper (002_rls_policies.sql)
| Funzione | Firma | search_path |
|----------|-------|-------------|
| `is_workspace_member` | `(UUID)` | `public` |
| `has_permission` | `(UUID, TEXT)` | `public` |
| `is_workspace_admin` | `(UUID)` | `public` |
| `has_client_access` | `(UUID)` | `public` |
| `is_board_member` | `(UUID)` | `public` |
| `is_channel_member` | `(UUID)` | `public` |

### Trigger SECURITY DEFINER (003_triggers.sql)
| Funzione | Firma | search_path |
|----------|-------|-------------|
| `handle_new_user` | `()` | `public, auth` |
| `add_workspace_owner` | `()` | `public` |
| `add_board_creator_as_member` | `()` | `public` |
| `add_channel_creator_as_member` | `()` | `public` |
| `log_audit_event` | `()` | `public` |
| `create_notification` | `(UUID, VARCHAR, VARCHAR, TEXT, JSONB)` | `public` |
| `notify_task_assignment` | `()` | `public` |
| `notify_mention` | `()` | `public` |

### Utility (003_triggers.sql)
| Funzione | Firma | search_path |
|----------|-------|-------------|
| `get_current_workspace` | `()` | `public` |
| `get_running_time_log` | `()` | `public` |
| `stop_running_time_logs` | `()` | `public` |
| `get_unread_count` | `(UUID)` | `public` |

### Storage (004_storage.sql)
| Funzione | Firma | search_path |
|----------|-------|-------------|
| `get_signed_url` | `(TEXT, TEXT, INTEGER)` | `public, storage` |

### Setup (005_seed_data.sql)
| Funzione | Firma | search_path |
|----------|-------|-------------|
| `create_default_roles` | `(UUID)` | `public` |
| `on_workspace_created` | `()` | `public` |
| `create_default_channels` | `(UUID, UUID)` | `public` |
| `setup_new_workspace` | `(VARCHAR, VARCHAR)` | `public` |

---

## Storage Bucket

| Bucket | Pubblico | Limite | Uso |
|--------|----------|--------|-----|
| `avatars` | Si | 2MB | Avatar utenti |
| `workspace-logos` | Si | 5MB | Logo workspace |
| `task-attachments` | No | 50MB | Allegati task |
| `client-files` | No | 100MB | File clienti |
| `chat-attachments` | No | 25MB | Allegati chat |

---

## Realtime (Tabelle Pubblicate)

Le seguenti tabelle hanno la pubblicazione Realtime attiva:
- `messages`
- `tasks`
- `notifications`
- `profiles`
- `channel_members`
