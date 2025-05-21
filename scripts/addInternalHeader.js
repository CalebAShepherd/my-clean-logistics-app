module.exports = function(fileInfo, { jscodeshift: j }) {
  const root = j(fileInfo.source);
  // Only process screen files
  if (!fileInfo.path.includes('/src/screens/')) return fileInfo.source;
  // Add imports if missing
  const hasHeaderImport = root.find(j.ImportDeclaration, { source: { value: '../components/InternalHeader' } }).size();
  if (!hasHeaderImport) {
    // Add SafeAreaView import after react-native imports
    root.find(j.ImportDeclaration, { source: { value: 'react-native' } }).at(-1).insertAfter(
      j.importDeclaration([j.importSpecifier(j.identifier('SafeAreaView'))], j.literal('react-native'))
    );
    // Add InternalHeader import after
    root.get().node.program.body.unshift(
      j.importDeclaration([j.importDefaultSpecifier(j.identifier('InternalHeader'))], j.literal('../components/InternalHeader'))
    );
  }
  // Add navigation prop to function params
  root.find(j.FunctionDeclaration).forEach(path => {
    const params = path.node.params;
    if (params.length === 1 && params[0].type === 'ObjectPattern') {
      const props = params[0].properties.map(p => p.key.name);
      if (!props.includes('navigation')) {
        path.node.params[0].properties.unshift(j.property('init', j.identifier('navigation'), j.identifier('navigation')));
      }
    }
  });
  // Wrap return JSX in SafeAreaView + InternalHeader
  root.find(j.ReturnStatement).forEach(path => {
    const arg = path.node.argument;
    if (arg && arg.type === 'JSXElement' && arg.openingElement.name.name !== 'SafeAreaView') {
      const title = path.parentPath.parentPath.node.id ? path.parentPath.parentPath.node.id.name : '';
      const header = j.jsxElement(
        j.jsxOpeningElement(j.jsxIdentifier('InternalHeader'), [
          j.jsxAttribute(j.jsxIdentifier('navigation'), j.jsxExpressionContainer(j.identifier('navigation'))),
          j.jsxAttribute(j.jsxIdentifier('title'), j.literal(title.replace(/([A-Z])/g, ' $1').trim()))
        ], true),
        null,
        []
      );
      const safe = j.jsxElement(
        j.jsxOpeningElement(j.jsxIdentifier('SafeAreaView'), [j.jsxAttribute(j.jsxIdentifier('style'), j.jsxExpressionContainer(j.objectExpression([j.property('init', j.identifier('flex'), j.literal(1))])) )], false),
        j.jsxClosingElement(j.jsxIdentifier('SafeAreaView')),
        [header, arg]
      );
      path.get('argument').replace(safe);
    }
  });
  return root.toSource();
}; 