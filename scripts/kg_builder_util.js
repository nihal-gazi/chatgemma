/**
 * Knowledge Graph Domain Dataset Generator Utility for ChatGemma
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = path.resolve(__dirname, "../src/data/knowledge");

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function generateEntityId(name, type = "Concept") {
  if (!name || typeof name !== "string") return "entity:unknown";
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `entity:${(type || "concept").toLowerCase()}:${slug}`;
}

function createGraphBuilder(domainName, defaultType = "Concept") {
  const entitiesMap = new Map();
  const relations = [];

  function addEntity(name, types, description = "", aliases = [], attributes = {}) {
    if (!name || typeof name !== "string") return null;
    const primaryType = Array.isArray(types) && types.length > 0 ? types[0] : defaultType;
    const id = generateEntityId(name, primaryType);
    if (!entitiesMap.has(id)) {
      entitiesMap.set(id, {
        id,
        name: name.trim(),
        types: Array.isArray(types) ? types : [types || defaultType],
        domain: domainName,
        description: description || `${name} in the domain of ${domainName}.`,
        aliases: Array.from(new Set([name.toLowerCase(), ...(aliases || [])])),
        attributes: { domain: domainName, ...(attributes || {}) },
        isActive: true,
      });
    } else {
      const existing = entitiesMap.get(id);
      if (aliases && Array.isArray(aliases)) {
        existing.aliases = Array.from(new Set([...existing.aliases, ...aliases]));
      }
      if (description && description.length > existing.description.length) {
        existing.description = description;
      }
    }
    return entitiesMap.get(id);
  }

  function addRelation(sourceName, predicate, targetName, description = "", weight = 1.0, confidence = 0.95) {
    if (!sourceName || !targetName || !predicate) return;
    const sourceEnt = addEntity(sourceName, [defaultType], "");
    const targetEnt = addEntity(targetName, [defaultType], "");

    if (!sourceEnt || !targetEnt) return;

    const predicateUpper = predicate.toUpperCase().replace(/\s+/g, "_");
    const relationId = `rel_${sourceEnt.id}_${predicateUpper}_${targetEnt.id}`;

    if (!relations.some((r) => r.id === relationId)) {
      relations.push({
        id: relationId,
        sourceId: sourceEnt.id,
        sourceName: sourceEnt.name,
        sourceType: sourceEnt.types[0],
        predicate: predicateUpper,
        targetId: targetEnt.id,
        targetName: targetEnt.name,
        targetType: targetEnt.types[0],
        domain: domainName,
        description: description || `${sourceEnt.name} ${predicate.toLowerCase().replace(/_/g, " ")} ${targetEnt.name}.`,
        weight,
        confidence,
        isActive: true,
      });
    }
  }

  function linkChain(nodes, predicate, descPrefix = "") {
    if (!Array.isArray(nodes)) return;
    for (let i = 0; i < nodes.length - 1; i++) {
      if (nodes[i] && nodes[i + 1]) {
        addRelation(
          nodes[i],
          predicate,
          nodes[i + 1],
          descPrefix ? `${descPrefix}: ${nodes[i]} ${predicate.toLowerCase()} ${nodes[i + 1]}` : ""
        );
      }
    }
  }

  function linkHub(centerNode, connectedNodes, predicate, reversePredicate = null) {
    if (!Array.isArray(connectedNodes)) return;
    for (const node of connectedNodes) {
      if (node) {
        addRelation(centerNode, predicate, node);
        if (reversePredicate) {
          addRelation(node, reversePredicate, centerNode);
        }
      }
    }
  }

  function exportGraph() {
    return {
      domain: domainName,
      version: "1.0.0",
      stats: {
        totalEntities: entitiesMap.size,
        totalRelations: relations.length,
      },
      entities: Array.from(entitiesMap.values()),
      relations,
    };
  }

  return {
    addEntity,
    addRelation,
    linkChain,
    linkHub,
    exportGraph,
    get size() {
      return entitiesMap.size;
    },
  };
}

export { createGraphBuilder, TARGET_DIR, generateEntityId };
