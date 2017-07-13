var N_SAMPLES = 100; //number of acc samples to show
var wrapper = ADL.XAPIWrapper;
wrapper.changeConfig({'endpoint': "https://htk.tlu.ee/lrs/data/xAPI/",
    'auth':  "Basic " + toBase64('4da0d771a634c608ff4c4730ba17fd8d9bc8ba8a:d753b5bf345d2c19e535f848cd350c0e9482f990')
});

var dotsHandle=null;
var queryHandle=null;
var updating = false;



var search = ADL.XAPIWrapper.searchParams();
search['verb'] = ADL.verbs.experienced.id;

var chart=null; // where the movement line chart will be drawn


var query = function(){
    // We start putting dots while we make the query
    document.querySelector('#status').innerHTML = 'Fetching data';
    dotsHandle = setInterval(function(){
        document.querySelector('#status').innerHTML += '.';
    }, 500);

    // asynchronous call
    ADL.XAPIWrapper.getStatements(search, null,
       function getmore(r){
          var res = JSON.parse(r.response);
          //ADL.XAPIWrapper.log(res.statements);
          console.log("Received "+res.statements.length+" from "+res.statements[0].stored+" to "+res.statements[res.statements.length-1].stored);
          //We extract the samples to display
          var samples = [];
          for(var i=0; i<res.statements.length; i++){
              var st = res.statements[i];
              console.log("Processing statement "+st);
              if(st.object.definition.extensions && st.object.definition.extensions["https://github.com/lprisan/classroom-tracker-app/"]){//If it's a classroom tracker statement
                  samples = samples.concat(st.object.definition.extensions["https://github.com/lprisan/classroom-tracker-app/"].accelData);
              }
          }
          if(samples.length>=N_SAMPLES){
                //sort from higher (newer) to lower
                samples = samples.sort(function(a,b) {return (a.timestamp > b.timestamp) ? -1 : ((b.timestamp > a.timestamp) ? 1 : 0);} ).slice(0,N_SAMPLES);
          }else{
              if (res.more && res.more !== ""){
                 ADL.XAPIWrapper.getStatements(search, res.more, getmore);
              }
          }

          clearInterval(dotsHandle); //stop the dots
          document.getElementById("status").innerHTML = "";

          console.log(JSON.stringify(samples));
          drawGraph(samples);

       });


}



var drawGraph = function(data){

    var data1 = ['data1'];
    var times = ['times'];
    data.forEach(function(d) {
        times.push(new Date(d.timestamp));
        data1.push(d.change);
    });

    console.log("generating graph for "+JSON.stringify(data1));

    if(!chart){
        chart = c3.generate({
            bindto: '#lrsMovement',
            data: {
              columns: [
                data1
              ]
            }
        });
    }else{
        chart.load({
            columns: [
                data1
            ]
        });
    }

}

//Button toggles the live update
document.getElementById("liveUpdate").addEventListener("click", function(){
    if(updating){//we were updating, stop doing the queries
        updating=false;
        document.getElementById("liveUpdate").innerHTML = "Click to live update";
        clearInterval(queryHandle); //stop the dots
        document.getElementById("status").innerHTML = "";

    }
    else{
        updating=true;
        queryHandle = setInterval(query, 4000);
        document.getElementById("liveUpdate").innerHTML = "Click to STOP live update";
    }
});

query();
