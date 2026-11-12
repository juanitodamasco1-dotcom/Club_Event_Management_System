/* ---------- tiny SVG chart kit ---------- */
var PALETTE = ["var(--accent)","var(--accent2)","#8B6BA8","#C9A227","#5B8C5A","#B0554F","#4E7FA6"];
function svgWrap(inner, w, h){
  return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" xmlns="http://www.w3.org/2000/svg" role="img">'+inner+'</svg>';
}
function truncateLabel(s,n){ s=String(s); return s.length>n ? s.slice(0,n-1)+"…" : s; }
function barChart(data, opts){
  opts = opts || {};
  var w = opts.width||520, h = opts.height||220, pad = 34, bottom = 30;
  var max = Math.max(1, Math.max.apply(null, data.map(function(d){return d.value;})));
  var n = data.length || 1;
  var chartW = w - pad*2, chartH = h - bottom - 14;
  var bw = Math.min(56, chartW/n*0.58);
  var gap = chartW/n;
  var bars = "", labels = "";
  data.forEach(function(d,i){
    var x = pad + gap*i + (gap-bw)/2;
    var bh = max>0 ? (d.value/max)*chartH : 0;
    var y = 14 + (chartH-bh);
    var color = d.color || PALETTE[i % PALETTE.length];
    bars += '<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+Math.max(bh,1)+'" rx="4" fill="'+color+'"></rect>';
    bars += '<text x="'+(x+bw/2)+'" y="'+(y-6)+'" font-size="11" text-anchor="middle" fill="var(--ink)" font-family="var(--font-body)">'+esc(d.value)+'</text>';
    labels += '<text x="'+(x+bw/2)+'" y="'+(h-10)+'" font-size="10.5" text-anchor="middle" fill="var(--ink-soft)" font-family="var(--font-body)">'+esc(truncateLabel(d.label,10))+'</text>';
  });
  var axis = '<line x1="'+pad+'" y1="'+(h-bottom)+'" x2="'+(w-pad+8)+'" y2="'+(h-bottom)+'" stroke="var(--line)" stroke-width="1"></line>';
  return svgWrap(axis+bars+labels, w, h);
}
function donutChart(data, opts){
  opts = opts || {};
  var w = opts.width||200, h = opts.height||200, cx=w/2, cy=h/2, r=Math.min(w,h)/2-10, r2=r*0.58;
  var total = data.reduce(function(a,d){return a+d.value;},0);
  if (total<=0){ return svgWrap('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="18"></circle>', w, h); }
  var ang = -Math.PI/2, paths="";
  data.forEach(function(d,i){
    var frac = d.value/total;
    var a0 = ang, a1 = ang + frac*Math.PI*2;
    ang = a1;
    if (frac<=0) return;
    var large = (a1-a0) > Math.PI ? 1 : 0;
    var x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0), x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    var xi0=cx+r2*Math.cos(a1), yi0=cy+r2*Math.sin(a1), xi1=cx+r2*Math.cos(a0), yi1=cy+r2*Math.sin(a0);
    var color = d.color || PALETTE[i % PALETTE.length];
    paths += '<path d="M'+x0+','+y0+' A'+r+','+r+' 0 '+large+' 1 '+x1+','+y1+' L'+xi0+','+yi0+' A'+r2+','+r2+' 0 '+large+' 0 '+xi1+','+yi1+' Z" fill="'+color+'"></path>';
  });
  var center = '<text x="'+cx+'" y="'+(cy-2)+'" font-size="19" text-anchor="middle" fill="var(--ink)" font-family="var(--font-display)" font-weight="600">'+total+'</text><text x="'+cx+'" y="'+(cy+15)+'" font-size="9.5" text-anchor="middle" fill="var(--ink-soft)" font-family="var(--font-body)">total</text>';
  return svgWrap(paths+center, w, h);
}
function legend(data){
  return '<div class="chart-legend">' + data.map(function(d,i){
    var color = d.color || PALETTE[i % PALETTE.length];
    return '<span class="legend-item"><span class="legend-dot" style="background:'+color+'"></span>'+esc(d.label)+' ('+d.value+')</span>';
  }).join("") + '</div>';
}
function lineChart(data, opts){
  opts = opts || {};
  var w = opts.width||520, h = opts.height||200, pad=34, bottom=28, top=16;
  var max = Math.max(1, Math.max.apply(null, data.map(function(d){return d.value;})));
  var n = data.length;
  var chartW = w-pad*2, chartH = h-top-bottom;
  var step = n>1 ? chartW/(n-1) : 0;
  var pts = data.map(function(d,i){
    var x = pad + step*i;
    var y = top + (chartH - (d.value/max)*chartH);
    return [x,y];
  });
  var line = pts.map(function(p,i){ return (i===0?"M":"L")+p[0]+","+p[1]; }).join(" ");
  var area = line + " L"+pts[pts.length-1][0]+","+(h-bottom)+" L"+pts[0][0]+","+(h-bottom)+" Z";
  var dots = pts.map(function(p,i){
    return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.2" fill="var(--accent)"></circle><text x="'+p[0]+'" y="'+(p[1]-9)+'" font-size="10.5" text-anchor="middle" fill="var(--ink)" font-family="var(--font-body)">'+data[i].value+'</text>';
  }).join("");
  var labels = pts.map(function(p,i){
    return '<text x="'+p[0]+'" y="'+(h-8)+'" font-size="10" text-anchor="middle" fill="var(--ink-soft)" font-family="var(--font-body)">'+esc(truncateLabel(data[i].label,8))+'</text>';
  }).join("");
  var axis = '<line x1="'+pad+'" y1="'+(h-bottom)+'" x2="'+(w-pad)+'" y2="'+(h-bottom)+'" stroke="var(--line)" stroke-width="1"></line>';
  return svgWrap(axis+'<path d="'+area+'" fill="var(--accent)" opacity="0.12"></path><path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2.2"></path>'+dots+labels, w, h);
}
