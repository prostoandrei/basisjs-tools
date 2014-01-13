var fs = require('fs');
var path = require('path');
var Flow = require('../build/misc/flow');
var extrator = require('../extractor');

var moduleOptions = require('./options');
var command = moduleOptions.command;

require('../build/misc/utils'); // TODO: make it explicit

//
// export
//

exports.l10n = l10n;
exports.options = moduleOptions;
exports.command = function(args, config){
  return command(args, config, l10n);
};

//
// if launched directly, run l10ner
//
if (process.mainModule === module)
  command(null, null, l10n);

//
// main function
//

function l10n(options){

  //
  // init
  //

  options = moduleOptions.norm(options);

  var flow = new Flow(options);
  var fconsole = flow.console;

  flow.exitOnFatal = true;
  flow.outputResourceDir = 'res/';

  fconsole.start('Build settings');
  fconsole.log('Base:', options.base);
  fconsole.log('Input file:', options.file);
  fconsole.log('Output path:', options.output);
  fconsole.endl();

  flow.files.typeByExt = options.extFileTypes;

  //
  // preprocessing
  //

  fconsole.start('Preprocessors');
  for (var type in options.preprocess)
  {
    var list = options.preprocess[type];
    var newList = flow.files.preprocess[type] = [];
    var hasPrerocessor = false;

    for (var i = 0; i < list.length; i++)
    {
      var preprocessorPath = list[i];

      fconsole.log('[' + type + '] ' + preprocessorPath);

      try {
        var processor = require(preprocessorPath);

        if (typeof processor.process == 'function')
        {
          newList.push(processor.process);
          hasPrerocessor = true;
        }
        else
        {
          console.warn('[ERROR] Preprocessor has no process function. Skipped.');
          process.exit();
        }
      } catch(e) {
        console.warn('[ERROR] Error on preprocessor load: ' + e);
        process.exit();
      }

      fconsole.end();
    }
  }
  if (!hasPrerocessor)
    fconsole.log('  not defined');
  fconsole.endl();


  //
  // process input
  //
  var inputFilename = options.file;

  // check input file exists
  if (!fs.existsSync(inputFilename) || !fs.statSync(inputFilename).isFile())
  {
    console.warn('Input file ' + inputFilename + ' not found');
    process.exit();
  }

  fconsole.start('\nInit\n====\n');

  // add input file in queue
  flow.files.add({
    filename: inputFilename
  });


  //
  // Main part
  //

  var handlers = extrator.handlers({
    cssInfo: false,
    l10nInfo: true
  }).concat([
    {
      'import': require('./handlers/import'),
      'export': require('./handlers/export')
    }[options.topic],

    // make a zip
    //options.target == 'zip' ? require('./misc/makeZip') : false,
    
    // flush output
    require('../build/misc/writeFiles'),

    finalHandler
  ]).filter(Boolean);

  var taskCount = 0;
  var timing = [];
  var time;

  function asyncTaskStart(){
    taskCount++;
  }
  function asyncTaskDone(){
    taskCount--;
    nextHandler();
  }

  function nextHandler(){
    if (!taskCount && handlers.length)
    {
      time.time = new Date - time.time;
      timing.push(time);

      fconsole.resetDeep();

      process.nextTick(runHandler);
    }
  }

  function runHandler(){
    var handler = handlers.shift();
    var title = handler.handlerName;

    if (title)
      fconsole.log('\n' + title + '\n' + ('='.repeat(title.length)) + '\n');

    fconsole.incDeep();

    time = {
      name: title,
      time: +new Date
    };
    handler(flow, asyncTaskStart, asyncTaskDone);

    nextHandler();
  }

  runHandler();

  //
  // show totals
  //
  function finalHandler(){
    // file types
    (function(){
      var fileTypeMap = {};
      var fileMap = {};
      var outputFileCount = 0;
      var outputSize = 0;
      var outputFiles = [];

      flow.files.queue.forEach(function(file){
        if (file.outputFilename && 'outputContent' in file)
        {
          if (!fileMap[file.outputFilename]) // prevent duplicates
          {
            fileMap[file.outputFilename] = true;
            outputFileCount++;

            var fileSize = Buffer.byteLength(file.outputContent, file.encoding);
            outputSize += fileSize;
            outputFiles.push(file.outputFilename + ' ' + fileSize + ' bytes');
          }
        }
      }, fileTypeMap);

      fconsole.start('Output ' + outputFileCount + ' files in ' + outputSize + ' bytes:')
      outputFiles.forEach(function(line){
        fconsole.log(line);
      });
      fconsole.endl();

    })();

    // total time
    fconsole.log('Warnings: ' + (flow.warns.length || 'NO'));
    //fconsole.log('Warnings: ' + JSON.stringify(flow.warns, null, 2));

    fconsole.log(options.topic + ' done in ' + (flow.time() / 1000).toFixed(3) + 's');
  }

  finalHandler.handlerName = options.topic + ' stat';
}