var grunt = require('grunt'),
    path = require('path'),
    jquery= require('jquery-html');

var file= grunt.file;

module.exports = helper = {};

helper.fixtures = path.join(__dirname, '..', 'fixtures');

helper.listFixtures = function ()
{
   var files= file.glob.sync(helper.fixtures+'/*');
   files.forEach(function (f, idx)
   {
     files[idx]= f.replace(helper.fixtures+'/','');
   });
   return files;
}

helper.$file= function (p,cb,done)
{
      var src= path.join(helper.fixtures, p);

      if (file.exists(src))
        jquery.create(file.read(src),function (window,$,free)
        {
              cb(window,$);
              free(); 
              done();
        });
      else
      {
        grunt.log.error('file "'+src+'" not found');
        done();
      }
}

// If verbose flag set, display output
helper.verboseLog = function() {};
if (grunt.util._.indexOf(process.argv, '-v') !== -1) {
  helper.verboseLog = function() { console.log.apply(null, arguments); };
}

// helper for creating assertTasks for testing tasks in child processes
helper.assertTask = function assertTask(task, options) {
  var spawn = require('child_process').spawn;
  task = task || 'default';
  options = options || {};

  // get next/kill process trigger
  var trigger = options.trigger || '.*(Waiting).*';
  delete options.trigger;

  // CWD to spawn
  var cwd = options.cwd || process.cwd();
  delete options.cwd;

  // Use grunt this process uses
  var spawnOptions = [process.argv[1]];
  // Turn options into spawn options
  grunt.util._.each(options, function(val, key) {
    spawnOptions.push('--' + key);
    spawnOptions.push(val);
  });
  // Add the tasks to run
  spawnOptions = spawnOptions.concat(task);

  // Return an interface for testing this task
  function returnFunc(runs, done) {
    // Spawn the node this process uses
    var spawnGrunt = spawn(process.argv[0], spawnOptions, {cwd:cwd});
    var out = '';

    if (!grunt.util._.isArray(runs)) {
      runs = [runs];
    }

    // Append a last function to kill spawnGrunt
    runs.push(function() { spawnGrunt.kill('SIGINT'); });

    // After watch starts waiting, run our commands then exit
    spawnGrunt.stdout.on('data', function(data) {
      data = grunt.log.uncolor(String(data));
      out += data;

      // If we should run the next function
      var shouldRun = true;

      // If our trigger has been found
      if (trigger !== false) {
        shouldRun = (new RegExp(trigger, 'gm')).test(data);
      }

      // Run the function
      if (shouldRun) {
        setTimeout(function() {
          var run = runs.shift();
          if (typeof run === 'function') { run(); }
        }, 500);
      }
    });

    // Throw errors for better testing
    spawnGrunt.stderr.on('data', function(data) {
      throw new Error(data);
    });

    // On process exit return what has been outputted
    spawnGrunt.on('exit', function() {
      helper.verboseLog(out);
      done(out);
    });
  }
  returnFunc.options = options;
  return returnFunc;
};

// clean up files within fixtures
helper.cleanUp = function cleanUp(files) {
  if (typeof files === 'string') files = [files];
  files.forEach(function(filepath) {
    filepath = path.join(helper.fixtures, filepath);
    if (grunt.file.exists(filepath)) {
      grunt.file.delete(filepath);
    }
  });
};
