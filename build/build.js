
var utils = require('./misc/utils');

var startTime = new Date();


var flowData = {
  console: require('./misc/console')
};

var flow = [
  require('./misc/options'),
  require('./misc/files'),

  require('./html/init'),
  require('./js/init'),
  require('./css/init'),

  // extract files
  require('./html/parse'),
  require('./html/fetchFiles'),
  require('./tmpl/init'),
  require('./js/parse'),
  require('./tmpl/parse'),
  require('./css/parse'),
  require('./resource/parse'),

  // process css
  require('./css/makePackages'),
  require('./css/linear'),
  require('./css/merge'),
  require('./css/pack'),
  require('./css/translate'),

  // process l10n
  require('./l10n/collect'),
  require('./l10n/modifyCall'),

  // process tmpl
  require('./tmpl/translate'),

  // css/html resources
  require('./resource/translate'),
  require('./resource/buildMap'),

  // process js
  require('./js/relink'),
  require('./js/merge'),
  require('./js/translate'),
  require('./js/makePackages'),
  require('./js/realignHtml'),

  // process html
  require('./html/translate'),
  
  // flush output
  require('./misc/writeFiles')
];

var fconsole = flowData.console;
var times = [];

flow.forEach(function(handler){
  var title = handler.handlerName;

  if (title)
  {
    fconsole.incDeep();
    fconsole.log('\n' + title + '\n' + ('='.repeat(title.length)) + '\n');
  }

  var handlerTime = new Date();
  handler(flowData);

  fconsole.resetDeep();

  var elapsedTime = (new Date - handlerTime);
  fconsole.log('');
  fconsole.log('Time: ' + (elapsedTime / 1000).toFixed(3) + 's');

  // save time
  times.push([elapsedTime, title]);
});

//
// show totals
//

fconsole.log('\nBuild stat\n==========\n');
fconsole.incDeep();

// file types
fconsole.log('File stat:');
fconsole.incDeep();

var fileTypeMap = {};
flowData.files.queue.forEach(function(file){
  if (!this[file.type])
    this[file.type] = [];

  this[file.type].push(file.filename);
}, fileTypeMap);
           
for (var key in fileTypeMap)
  fconsole.log(key + ': ' + fileTypeMap[key].length);

fconsole.decDeep();
fconsole.log('');

// timing
fconsole.log('Timing:');
fconsole.incDeep();
for (var i = 0; i < times.length; i++)
{
  var t = String(times[i][0]);
  fconsole.log(' '.repeat(5 - t.length) + t + '  ' + (times[i][1] || '[No title step]'));
}
fconsole.decDeep();
fconsole.log('');

// total time
fconsole.log('Build done in ' + ((new Date - startTime) / 1000).toFixed(3) + 's');