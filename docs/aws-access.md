# AWS access for the team

How teammates get into the hackathon AWS account and reach the deployed resources. This is a
shared workshop account reached through a temporary role, not individual IAM users.

| | |
|---|---|
| Status | Aurora (`CodeAI-DataStack`) deployed and is the backend system of record; join method still to confirm with the organizers. |
| Last updated | 2026-11-04 |
| Account | Hackathon account (id in team chat, not the repo), region `us-west-2` |
| Role | `WSParticipantRole` (same broad permissions for everyone) |

## 1. Get credentials into the account

Each person uses their **own** temporary credentials. Nobody shares keys.

- Get in the way the organizers provide: a Workshop Studio URL, an SSO/federation link, or a
  provided EC2 instance. **Confirm which with the organizers** — it is not visible from inside the
  account.
- Credentials are short-lived and expire. Keep them in your shell or use `aws login` / SSO. Never
  put them in a file, a commit, or a chat (C-38, ADR-013).
- Confirm you are in:
  ```bash
  aws sts get-caller-identity   # expect .../WSParticipantRole/... in the hackathon account
  aws configure get region       # or: echo $AWS_DEFAULT_REGION  -> us-west-2
  ```

## 2. Same account facts for everyone

- Region `us-west-2` and the account id — share in team chat, not in the repo.
- Copy `.env.example` to `.env.local` (gitignored) and set the mode switches. Most work needs no
  AWS at all: the defaults (`VITE_SERVICE_MODE=mock`, `MODEL_MODE=stub`, `STORE_MODE=json`) run the
  whole student loop on stubs (architecture 1.8).
- **Store direction:** the deployed Aurora cluster is the backend's system of record, and the Aurora
  store adapter is now built (`backend/store/aurora_repository.py`, ADR-017). Set `STORE_MODE=aurora`
  to run the backend on the cluster via the Data API; it reads `AURORA_CLUSTER_ARN`, `AURORA_SECRET_ARN`,
  and `AURORA_DATABASE_NAME` from the environment (the `ApiStack` Lambda already has these and the Data
  API IAM wired). `STORE_MODE=json` remains the no-AWS default for local/demo work. The adapter passes
  the same store contract suite as the JSON adapter; the live contract test (`test_aurora_live.py`) runs
  post-deploy against the cluster when those two ARNs are set.

## 3. Reaching the deployed resources

Resources are found through **CDK stack outputs**, never hard-coded. After a deploy:

```bash
aws cloudformation describe-stacks --stack-name CodeAI-DataStack \
  --query "Stacks[0].Outputs" --region us-west-2
```

- **Aurora:** the backend uses the Aurora Serverless v2 **Data API** (ADR-016). There is no Postgres
  username, password, or psql connection to set up, and no VPC, security group, or SSH tunnel for
  teammates to configure. The backend calls the Data API with the cluster ARN and the secret ARN;
  IAM authorizes it.
- **The DB credential stays in Secrets Manager.** The shared role can read it, but nobody copies the
  password out. Put the cluster ARN, secret ARN, and database name into `.env.local` from the stack
  outputs.
- **Model ids and the Guardrail id** come from SSM parameters under `SSM_PREFIX` (architecture 2.14),
  not from env values.

### 3.1 One shared Aurora cluster — do not deploy your own

There is exactly one Aurora cluster for the whole team: the one in `CodeAI-DataStack` (deployed
2026-11-04). Everyone points the backend at that same cluster. **Do not run
`cdk deploy CodeAI-DataStack` yourself** — only the infra owner deploys it (section 5), and a second
deploy of the same stack clobbers the first.

To run the backend against the shared cluster, read the ARNs from the stack outputs (command above)
and put them in your gitignored `.env.local` — never a literal ARN in the repo (ADR-013):

```bash
# in .env.local
STORE_MODE=aurora
AURORA_CLUSTER_ARN=<ClusterArn from CodeAI-DataStack outputs / SSM /codeai/data/cluster-arn>
AURORA_SECRET_ARN=<SecretArn / SSM /codeai/data/secret-arn>
AURORA_DATABASE_NAME=codeai
```

The deployed API Lambda already has these wired (the `ApiStack` sets them and attaches the Data API
IAM policy), so nothing extra is needed for the deployed path.

**It is shared state.** Everyone's reads and writes land in the same tables, so expect other people's
rows. For isolated local work prefer `STORE_MODE=json` (no AWS); use `aurora` only when you need the
real store. Do **not** run the live contract test (`test_aurora_live.py`) against the shared cluster
casually — it writes synthetic rows (`stu-x`, `teacher-1`).

## 4. Bootstrap: once for the whole team

**Done on 2026-11-04** (`CDKToolkit` exists in `us-west-2`). Nobody needs to run it again. For the
record, it was run once with:

```bash
npx cdk bootstrap aws://<account-id>/us-west-2
```

After that, everyone's `cdk deploy` works against the shared bootstrap resources. It is not
per-person.

## 5. Working in one shared account without collisions

One account, one all-powerful role, several people: changes are not isolated, so coordinate.

- **Anyone can change or delete anything.** There is no per-person permission scoping in a workshop
  account. Be careful with `cdk destroy` and with deleting resources you did not create.
- **Own your stack.** Track A owns `infra/` and the shared stacks (`DataStack`, `AgentsSafetyStack`,
  observability). Two `cdk deploy`s of the same stack at once will fail or clobber each other. Agree
  who deploys what; the track ownership in the implementation plan is the default.
- **Prefer the mock path.** `STORE_MODE=json` and `MODEL_MODE=stub` let most people build and test
  without deploying anything.

## 6. First-deploy handoff checklist

Whoever runs the first deploy posts these to the team so others can fill `.env.local`:

- [x] `CodeAI-DataStack` deployed (2026-11-04); outputs captured. Schema and master data loaded
  (`DbLoadResult` output). Read the values from the stack outputs or SSM `/codeai/data/*`:
- [x] Aurora cluster ARN (`ClusterArn`, `/codeai/data/cluster-arn`)
- [x] Aurora secret ARN (`SecretArn`, `/codeai/data/secret-arn`)
- [x] Database name (`DatabaseName`, `/codeai/data/database-name`; it is `codeai`)
- [x] Data API access policy for API and agent roles (`AccessPolicyArn`, `/codeai/data/access-policy-arn`)
- [ ] SSM parameter names (model ids, Guardrail id and version)
- [ ] API base URL (once `ApiStack` is deployed)

## Open questions for the organizers

- How does each teammate get credentials into **this** account (Workshop Studio URL, SSO link, or a
  per-person EC2 instance)?
- Who is notified when the `hackathon-budget-<account-id>` budget trips?
