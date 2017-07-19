app.factory('stationList', function(){
  return{
    stationList : [
      {"station_name":"Wellington", "station_id":"WELL", "line":"JVL", "lat":-41.27896857, "lon":174.7805617},
      {"station_name":"Crofton Downs", "station_id":"CROF", "line":"JVL", "lat":-41.25504083, "lon":174.7664988},
      {"station_name":"Ngaio", "station_id":"NGAI", "line":"JVL", "lat":-41.25097097, "lon":174.7718585},
      {"station_name":"Awarua Street", "station_id":"AWAR", "line":"JVL", "lat":-41.246375, "lon":174.77477},
      {"station_name":"Simla Crescent", "station_id":"SIML", "line":"JVL", "lat":-41.24679734, "lon":174.7843365},
      {"station_name":"Box Hill", "station_id":"BOXH", "line":"JVL", "lat":-41.24601334, "lon":174.7887566},
      {"station_name":"Khandallah", "station_id":"KHAN", "line":"JVL", "lat":-41.24267127, "lon":174.7934371},
      {"station_name":"Raroa", "station_id":"RARO", "line":"JVL", "lat":-41.23225739, "lon":174.8017479},
      {"station_name":"Johnsonville", "station_id":"JOHN", "line":"JVL", "lat":-41.22334496, "lon":174.8047433},
      {"station_name":"Wellington", "station_id":"WELL", "line":"MEL", "lat":-41.27896857, "lon":174.7805617},
      {"station_name":"Ngauranga", "station_id":"NGAU", "line":"MEL", "lat":-41.249038, "lon":174.813013},
      {"station_name":"Petone", "station_id":"PETO", "line":"MEL", "lat":-41.22201097, "lon":174.8694881},
      {"station_name":"Western Hutt", "station_id":"WEST", "line":"MEL", "lat":-41.21187, "lon":174.889995},
      {"station_name":"Melling", "station_id":"MELL", "line":"MEL", "lat":-41.20348555, "lon":174.9054004},
      {"station_name":"Wellington", "station_id":"WELL", "line":"KPL", "lat":-41.27896857, "lon":174.7805617},
      {"station_name":"Takapu Road", "station_id":"TAKA", "line":"KPL", "lat":-41.18529832, "lon":174.8282579},
      {"station_name":"Redwood", "station_id":"REDW", "line":"KPL", "lat":-41.17564595, "lon":174.8270513},
      {"station_name":"Tawa", "station_id":"TAWA", "line":"KPL", "lat":-41.169538, "lon":174.828352},
      {"station_name":"Linden", "station_id":"LIND", "line":"KPL", "lat":-41.15895027, "lon":174.8320205},
      {"station_name":"Kenepuru", "station_id":"KENE", "line":"KPL", "lat":-41.14962774, "lon":174.8381124},
      {"station_name":"Porirua", "station_id":"PORI", "line":"KPL", "lat":-41.1693215, "lon":174.828352},
      {"station_name":"Paremata", "station_id":"PARE", "line":"KPL", "lat":-41.10631518, "lon":174.8662679},
      {"station_name":"Mana", "station_id":"MANA", "line":"KPL", "lat":-41.09528391, "lon":174.8681817},
      {"station_name":"Plimmerton", "station_id":"PLIM", "line":"KPL", "lat":-41.08390554, "lon":174.8670662},
      {"station_name":"Pukerua Bay", "station_id":"PUKE", "line":"KPL", "lat":-41.03801419, "lon":174.8867769},
      {"station_name":"Paekakariki", "station_id":"PAEK", "line":"KPL", "lat":-40.98721597, "lon":174.9544437},
      {"station_name":"Paraparaumu", "station_id":"PARA", "line":"KPL", "lat":-40.91665034, "lon":175.0071756},
      {"station_name":"Waikanae", "station_id":"WAIK", "line":"KPL", "lat":-40.876614, "lon":175.065931},
      {"station_name":"Wellington", "station_id":"WELL", "line":"HVL", "lat":-41.27896857, "lon":174.7805617},
      {"station_name":"Ngauranga", "station_id":"NGAU", "line":"HVL", "lat":-41.249038, "lon":174.813013},
      {"station_name":"Petone", "station_id":"PETO", "line":"HVL", "lat":-41.22201097, "lon":174.8694881},
      {"station_name":"Ava", "station_id":"AVA", "line":"HVL", "lat":-41.219465, "lon":174.891746},
      {"station_name":"Woburn", "station_id":"WOBU", "line":"HVL", "lat":-41.22087722, "lon":174.9112639},
      {"station_name":"Waterloo", "station_id":"WATE", "line":"HVL", "lat":-41.21389774, "lon":174.9210998},
      {"station_name":"Epuni", "station_id":"EPUN", "line":"HVL", "lat":-41.20750643, "lon":174.9303115},
      {"station_name":"Naenae", "station_id":"NAEN", "line":"HVL", "lat":-41.19783157, "lon":174.9461623},
      {"station_name":"Wingate", "station_id":"WING", "line":"HVL", "lat":-41.18878155, "lon":174.9546969},
      {"station_name":"Taita", "station_id":"TAIT", "line":"HVL", "lat":-41.18035079, "lon":174.9607545},
      {"station_name":"Pomare", "station_id":"POMA", "line":"HVL", "lat":-41.16942, "lon":174.969737},
      {"station_name":"Manor Park", "station_id":"MANO", "line":"HVL", "lat":-41.156368, "lon":174.978746},
      {"station_name":"Silverstream", "station_id":"SILV", "line":"HVL", "lat":-41.14729787, "lon":175.0102924},
      {"station_name":"Heretaunga", "station_id":"HERE", "line":"HVL", "lat":-41.142395, "lon":175.025795},
      {"station_name":"Trentham", "station_id":"TREN", "line":"HVL", "lat":-41.137738, "lon":175.038804},
      {"station_name":"Wallaceville", "station_id":"WALL", "line":"HVL", "lat":-41.13051788, "lon":175.0588151},
      {"station_name":"Upper Hutt", "station_id":"UPPE", "line":"HVL", "lat":-41.12623233, "lon":175.0703175},
      {"station_name":"Wellington", "station_id":"WELL", "line":"WRL", "lat":-41.27896857, "lon":174.7805617},
      {"station_name":"Petone", "station_id":"PETO", "line":"WRL", "lat":-41.22201097, "lon":174.8694881},
      {"station_name":"Waterloo", "station_id":"WATE", "line":"WRL", "lat":-41.21389774, "lon":174.9210998},
      {"station_name":"Upper Hutt", "station_id":"UPPE", "line":"WRL", "lat":-41.12623233, "lon":175.0703175},
      {"station_name":"Maymorn", "station_id":"MAYM", "line":"WRL", "lat":-41.10808608, "lon":175.1340901},
      {"station_name":"Featherston", "station_id":"FEAT", "line":"WRL", "lat":-41.11345391, "lon":175.3297632},
      {"station_name":"Woodside", "station_id":"WOOD", "line":"WRL", "lat":-41.06736154, "lon":175.4018978},
      {"station_name":"Matarawa", "station_id":"MATA", "line":"WRL", "lat":-41.04880879, "lon":175.4487361},
      {"station_name":"Carterton", "station_id":"CART", "line":"WRL", "lat":-41.02168247, "lon":175.5233127},
      {"station_name":"Solway", "station_id":"SOLW", "line":"WRL", "lat":-40.95338889, "lon":175.6255178},
      {"station_name":"Masterton", "station_id":"MAST", "line":"WRL", "lat":-40.94043328, "lon":175.6547484}
    ]
  }
})
