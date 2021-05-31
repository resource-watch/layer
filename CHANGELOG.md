## 31/05/2021

- Update `rw-api-microservice-node` to add CORS support.

## 21/05/2021

- Add support for hosts from `referer` header when generating pagination links.

## 22/02/2021

- Update `rw-api-microservice-node` to fix issue with Fastly headers.

## 12/02/2021

- Remove dependency on CT's `authenticated` functionality

## 14/01/2021

- Replace CT integration library

# v1.2.0

## 17/11/2020

- Add proxy endpoint for `expire-cache` functionality

# v1.1.2

## 13/07/2020

- Security updates to the `handlebars` and `websocket-extensions` NPM packages.
- Prevent filtering by internal `userRole` and `userName` fields.
- Fix issue where microservice user validation would always fail for the currently used token.

# v1.1.1

## 09/04/2020

- Update k8s configuration with node affinity.

# v1.1.0

## 24/01/2020

- Add possibility of sorting layers by user fields (such as name or role).

# v1.0.0

## 14/01/2020

- Fix issue where pagination links in GET layers would have unexpected `usersRole` parameter.

# Previous

- Fix issue where pagination links in GET layers would have unexpected `usersRole` parameter.
- Add support for dataset overwrite using multiple files in parallel.
- Update node version to 12.
- Replace npm with yarn.
- Add liveliness and readiness probes.
- Add resource quota definition for kubernetes.
