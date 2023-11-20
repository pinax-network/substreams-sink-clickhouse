import client, { Counter, Gauge } from "prom-client";

export const registry = new client.Registry();
const entityChangesInsertedMetrics = new Map<string, Counter>();
const sinkRequestMetrics = new Map<string, Counter>();

export async function metrics() {
  const headers = new Headers();
  headers.set("Content-Type", registry.contentType);
  return new Response(await registry.metrics(), { status: 200, headers });
}

export function registerCounter(name: string, help: string) {
  try {
    registry.registerMetric(new client.Counter({ name, help }));
    return registry.getSingleMetric(name) as Counter;
  } catch (error) {}
}

export function registerGauge(name: string, help: string) {
  try {
    registry.registerMetric(new client.Gauge({ name, help }));
    return registry.getSingleMetric(name) as Gauge;
  } catch (error) {}
}

export const requests = registerCounter("requests", "Total requests")!;
export const request_errors = registerCounter("request_errors", "Total failed requests")!;
export const sink_requests = registerCounter("sink_requests", "Total sink requests")!;

export const entity_changes_inserted = registerCounter("entity_changes_inserted", "Total inserted entity changes")!;
export const entity_changes_updated = registerCounter("entity_changes_updated", "Total updated entity changes")!;
export const entity_changes_deleted = registerCounter("entity_changes_deleted", "Total deleted entity changes")!;
export const entity_changes_unsupported = registerCounter("entity_changes_unsupported", "Total unsupported entity changes")!;

export function incrementInsertedEntityChanges(chain: string, moduleHash: string) {
  entity_changes_inserted.inc();

  const metricName = `entity_changes_inserted_${chain}_${moduleHash}`;
  if (entityChangesInsertedMetrics.has(metricName)) {
    entityChangesInsertedMetrics.get(metricName)!.inc();
    return;
  }

  const metric = registerCounter(metricName, `Total inserted entity changes for ${chain} and ${moduleHash}`)!;
  entityChangesInsertedMetrics.set(metricName, metric);
  metric.inc();
}

export function incrementSinkRequests(chain: string, moduleHash: string) {
  sink_requests.inc();

  const metricName = `sink_requests_${chain}_${moduleHash}`;
  if (sinkRequestMetrics.has(metricName)) {
    sinkRequestMetrics.get(metricName)!.inc();
    return;
  }

  const metric = registerCounter(metricName, `Total sink requests for ${chain} and ${moduleHash}`)!;
  sinkRequestMetrics.set(metricName, metric);
  metric.inc();
}
