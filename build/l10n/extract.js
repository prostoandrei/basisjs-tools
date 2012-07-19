
module.exports = function(flow){
  var queue = flow.files.queue;
  var fconsole = flow.console;

  flow.l10n = {
    cultureList: [],  // TODO: fetch culture list from basis.l10n
    defList: [],
    getTokenList: [],
    packages: [],
    pathes: {}
  };


  //
  // Scan javascript for l10n
  //

  fconsole.start('Scan javascript');
  for (var i = 0, file; file = queue[i]; i++)
  {
    if (file.type == 'script')
    {
      // scan file for basis.l10n.createDictionary & basis.l10n.setCultureList
      fconsole.start(file.filename ? file.relpath : '[inline script]');

      // store reference for basis.l10n module
      if (file.namespace == 'basis.l10n')
      {
        fconsole.log('[i] basis.l10n module found, store reference for it');
        flow.l10n.module = file;
      }

      scanFile(file, flow);

      fconsole.endl();
    }
  }
  fconsole.endl();

  //
  // Add dictionary files
  //

  fconsole.start('Fetch dictionary files');
  for (var path in flow.l10n.pathes)
  {
    fconsole.start(path);
    for (var i = 0; culture = flow.l10n.cultureList[i]; i++)
    {
      flow.files.add({
        filename: path + '/' + culture + '.json',
        type: 'l10n',
        culture: culture
      });
    }
    fconsole.endl();
  }
};

module.exports.handlerName = '[l10n] Extract';


//
// Main part
//

var at = require('../js/ast_tools');
var CREATE_DICTIONARY = at.normalize('basis.l10n.createDictionary');
var GET_TOKEN = at.normalize('basis.l10n.getToken');
var SET_CULTURE_LIST = at.normalize('basis.l10n.setCultureList');

function scanFile(file, flow){
  var context = flow.js.getFileContext(file);
  var fconsole = flow.console;
  var defList = flow.l10n.defList;
  var getTokenList = flow.l10n.getTokenList;
  var pathes = flow.l10n.pathes;

  at.walk(file.ast, {
    call: function(expr, args){
      switch (at.translate(expr))
      {
        case CREATE_DICTIONARY:
          var eargs = at.getCallArgs(args, context);
          var entry = {
            args: args,
            name: eargs[0],
            path: eargs[1],
            keys: eargs[2],
            file: file
          };

          fconsole.log('[FOUND] createDictionary ' + entry.name + ' -> ' + entry.path);

          file.hasL10n = true;
          defList.push(entry);

          if (!pathes[entry.path])
            pathes[entry.path] = {};

          pathes[entry.path][entry.name] = true;

          break;

        //case L10N_TOKEN:
        case GET_TOKEN:
          if (args.length == 1 && args[0][0] == 'string')
          {
            fconsole.log('[FOUND] getToken ' + args[0][1]);

            file.hasL10n = true;
            getTokenList.push({
              args: args,
              file: file
            });
          }
          break;

        case SET_CULTURE_LIST:
          var list = at.getCallArgs(args, context)[0];

          fconsole.log('[FOUND] ' + at.translateCallExpr(expr, args) + ' in ' + file.relpath);

          if (typeof list == 'string')
            list = list.trim().split(/\s+/);

          if (Array.isArray(list))
          {
            for (var i = 0, cultureDef; cultureDef = list[i]; i++)
            {
              var clist = cultureDef.split(/\//);
              list[i] = clist[0];
            }

            fconsole.log('        [OK] Set culture list ' + JSON.stringify(list));
            list.forEach(flow.l10n.cultureList.add, flow.l10n.cultureList);
          }
          else
          {
            fconsole.log('        [!] Can\'t convert into array (ignored)');
          }

          break;
      }
    }
  });
}