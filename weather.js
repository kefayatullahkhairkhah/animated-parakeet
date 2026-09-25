function changeWeather(condition){

const body=document.body;

if(condition==="sunny"){
body.className=
"bg-gradient-to-r from-yellow-400 to-orange-500 min-h-screen";
}

if(condition==="rainy"){
body.className=
"bg-gradient-to-r from-slate-600 to-blue-900 min-h-screen";
}

if(condition==="cloudy"){
body.className=
"bg-gradient-to-r from-gray-400 to-gray-700 min-h-screen";
}

}