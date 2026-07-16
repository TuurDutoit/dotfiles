<!-- GENERATED FILE — do not edit.
Source: `bt topics config topic-map set --help` from bt 0.15.1.
Refresh: `python3 scripts/generate_reference.py`
-->

Update a configured Topics topic map by name or function ID

Usage: bt topics config topic-map set [OPTIONS] <TOPIC_MAP>

Arguments:
  <TOPIC_MAP>  Topic map name or function ID

Options:
      --automation-id <AUTOMATION_ID>
          Specific automation ID to search within
      --json
          Output as JSON
      --name <NAME>
          Human-friendly topic map name
  -v, --verbose
          Increase output verbosity [env: BRAINTRUST_VERBOSE=]
      --description <DESCRIPTION>
          Human-friendly topic map description
  -q, --quiet
          Reduce interactive UI output [env: BRAINTRUST_QUIET=]
      --no-color
          Disable ANSI color output [env: BRAINTRUST_NO_COLOR=]
      --source-facet <SOURCE_FACET>
          Facet field this topic map clusters
      --embedding-model <EMBEDDING_MODEL>
          Embedding model used for clustering
      --no-input
          Disable all interactive prompts [env: BRAINTRUST_NO_INPUT=]
      --distance-threshold <DISTANCE_THRESHOLD>
          Maximum centroid distance before returning no_match
      --profile <PROFILE>
          Use a saved login profile (or via BRAINTRUST_PROFILE) [env: BRAINTRUST_PROFILE=]
      --disable-reconciliation <DISABLE_RECONCILIATION>
          Whether to disable reconciliation against the previously saved report [possible values: true, false]
  -o, --org <ORG_NAME>
          Override active org (or via BRAINTRUST_ORG_NAME) [env: BRAINTRUST_ORG_NAME=]
      --algorithm <ALGORITHM>
          Clustering algorithm to use when generating topics [possible values: hdbscan, kmeans]
  -p, --project <PROJECT>
          Override active project [env: BRAINTRUST_DEFAULT_PROJECT]
      --dimension-reduction <DIMENSION_REDUCTION>
          Dimension reduction step to use before clustering [possible values: umap, pca, none]
      --prefer-profile
          Prefer profile credentials even if BRAINTRUST_API_KEY/--api-key is set
      --sample-size <SAMPLE_SIZE>
          Maximum number of rows sampled during topic-map generation
      --api-url <API_URL>
          Override API URL (or via BRAINTRUST_API_URL) [env: BRAINTRUST_API_URL]
      --n-clusters <N_CLUSTERS>
          Number of clusters when using kmeans
      --app-url <APP_URL>
          Override app URL (or via BRAINTRUST_APP_URL) [env: BRAINTRUST_APP_URL]
      --min-cluster-size <MIN_CLUSTER_SIZE>
          Minimum cluster size when using hdbscan
      --ca-cert <CA_CERT>
          Path to a PEM-encoded CA bundle used for HTTPS requests [env: BRAINTRUST_CA_CERT]
      --min-samples <MIN_SAMPLES>
          Minimum samples when using hdbscan
      --env-file <ENV_FILE>
          Path to a .env file to load before running commands [env: BRAINTRUST_ENV_FILE]
      --hierarchy-threshold <HIERARCHY_THRESHOLD>
          Hierarchy threshold used when naming hierarchical clusters
      --naming-model <NAMING_MODEL>
          LLM model used to name generated topics
  -h, --help
          Print help
