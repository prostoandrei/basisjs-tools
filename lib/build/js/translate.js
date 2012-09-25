//
// export handler
//

var at = require('./ast_tools');

module.exports = function(flow){
  var queue = flow.files.queue;
  var fconsole = flow.console;

  for (var i = 0, file; file = queue[i]; i++)
    if (file.type == 'script')
    {
      fconsole.log(file.relpath);

      file.outputContent = at.translate2(file.ast);

      try {
        file.jsResourceContent = new Function('exports, module, basis, global, __filename, __dirname, resource', file.outputContent);
      } catch(e) {
        file.jsResourceContent = Function();
        fconsole.log('[ERROR] Compilation error: ' + file.relpath + ' (' + e + ')');
      }
    }
};

module.exports.handlerName = '[js] Translate';
