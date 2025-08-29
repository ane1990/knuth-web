


────────────────────────────────────────────
CHEATSHEET – Day of 28 Aug 2025  
Change every domain reference from `miniops.me` → `stallman.duckdns.org`
────────────────────────────────────────────

1. Re-create cluster with the new domain (one-shot)

   ```bash
   # on the ops host
   kind delete cluster --name nuvolaris
   export OPS_DOMAIN=stallman.duckdns.org
   ops setup mini
   ```

   ➜ cluster comes up with all Ingresses already using the new domain.

2. Patch running cluster (no re-create)

   a) Dump & patch every Ingress  
   ```bash
   ops debug kube ctl CMD="get ingress -n nuvolaris -o yaml" \
     | sed -e 's/\.miniops\.me/.stallman.duckdns.org/g' \
           -e 's/miniops\.me/stallman.duckdns.org/g' \
     > all-ingress-stallman.yaml

   ops debug kube ctl CMD="apply -f -" < all-ingress-stallman.yaml
   ```

   b) Patch ConfigMaps / Secrets that still hold the old host  
   ```bash
   # find the object(s)
   ops debug kube ctl CMD="get cm,secret -n nuvolaris -o json" \
     | jq -r '.items[] | select(.data | to_entries | map(.value | strings | contains("miniops.me")) | any) | .kind + "/" + .metadata.name'

   # patch the first ConfigMap (example name: nuv-config)
   ops debug kube ctl CMD="patch cm nuv-config -n nuvolaris \
     --type merge -p '{\"data\":{\"apihost\":\"https://stallman.duckdns.org\"}}'"
   ```
also fix localhost:9000
         prensent in S3_API_URL env variable 

you can simply set using ops env add S3_API_URL http://s3.stallman.duckdns.org
i was guessing where this env variable are persisted, since was not present in the cluster cm or secret, so i investigated further:
this value is in the ops env stored in the couchDb nuvolaris_users_metadata database.
its accessible with user and password
ops debug kube ctl CMD="exec -it couchdb-0 -n nuvolaris -- curl -u $COUCHDB_USER:$COUCHDB_PASS -X GET http://localhost:5984/nuvolaris_users_metadata/devel"

to get the COUCHDB_USER and COUCHDB_PASS
set COUCHDB_USER (ops debug kube ctl CMD="get secret couchdb-auth-52gm9886fg -n nuvolaris -o jsonpath='{.data.db_username}'" | base64 -d)
set COUCHDB_PASSWORD (ops debug kube ctl CMD="get secret couchdb-auth-52gm9886fg -n nuvolaris -o jsonpath='{.data.db_password}'" | base64 -d)


  

3. Verify

   ```bash
   ops debug kube ctl CMD="get ingress -n nuvolaris -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.rules[*].host}{\"\\n\"}{end}'"
   ```

All commands above were executed on **Thu 28 Aug 2025** as shown in the `history`.