-- Set global statement timeouts per role to prevent any single query from
-- holding a DB connection indefinitely. This protects against the scenario
-- where a slow/stuck query exhausts the connection pool and takes down the DB.
--
-- Individual functions can override with a tighter SET statement_timeout if needed.

ALTER ROLE authenticated SET statement_timeout = '15s';
ALTER ROLE anon SET statement_timeout = '5s';
ALTER ROLE service_role SET statement_timeout = '30s';
