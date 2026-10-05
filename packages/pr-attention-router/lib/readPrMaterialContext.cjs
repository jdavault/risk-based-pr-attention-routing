const materialContextPattern =
  /^\s*Material context:\s*(SUFFICIENT|CONFLICTING)\s*$/gimu;

function readPrMaterialContext(body) {
  const declarations = new Set(
    [...body.matchAll(materialContextPattern)].map((match) =>
      match[1].toUpperCase(),
    ),
  );

  if (declarations.has('CONFLICTING')) {
    return 'CONFLICTING';
  }

  return declarations.has('SUFFICIENT') ? 'SUFFICIENT' : 'MISSING';
}

module.exports = { readPrMaterialContext };
