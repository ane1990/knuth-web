


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

3. Verify

   ```bash
   ops debug kube ctl CMD="get ingress -n nuvolaris -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.rules[*].host}{\"\\n\"}{end}'"
   ```

All commands above were executed on **Thu 28 Aug 2025** as shown in the `history`.