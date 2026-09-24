const directions=['الشمال','الشمال الشرقي','الشرق','الجنوب الشرقي','الجنوب','الجنوب الغربي','الغرب','الشمال الغربي'];

export function describeSkyPosition(azimuth,altitude){
  const az=((azimuth%360)+360)%360;
  const direction=directions[Math.round(az/45)%8];
  if(altitude<0)return {heading:'نجمتكِ تحت الأفق هسا.',detail:`مكانها باتجاه ${direction}، تحت خط الأفق.`};
  if(altitude>=80)return {heading:'نجمتكِ قريبة من فوق راسكِ.',detail:'عالية بالسما، تقريبًا فوقكِ مباشرة.'};
  const detail=altitude<15?'قريبة من خط الأفق؛ ارفعي نظرك شوي.':altitude<35?'فوق الأفق بشوي.':altitude<60?'تقريبًا بنص المسافة بين الأفق وفوق راسكِ.':'عالية بالسما؛ ارفعي نظرك لفوق.';
  return {heading:`نجمتكِ هسا جهة ${direction}.`,detail};
}
