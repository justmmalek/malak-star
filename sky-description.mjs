const directions=['الشمال','الشمال الشرقي','الشرق','الجنوب الشرقي','الجنوب','الجنوب الغربي','الغرب','الشمال الغربي'];
const number=new Intl.NumberFormat('ar-JO',{maximumFractionDigits:0});

export function describeSkyPosition(azimuth,altitude){
  const az=((azimuth%360)+360)%360;
  const direction=directions[Math.round(az/45)%8];
  const degrees=number.format(Math.abs(altitude));
  if(altitude<0)return {heading:'نجمتكِ تحت الأفق الآن.',detail:`باتجاه ${direction}، حوالي ${degrees}° تحت الأفق.`};
  if(altitude>=80)return {heading:'نجمتكِ قريبة من فوق رأسكِ الآن.',detail:`ارتفاعها حوالي ${degrees}° فوق الأفق.`};
  const height=altitude<15?'قريبة من الأفق':altitude>=65?'عالية في السماء':'مرتفعة في السماء';
  return {heading:`نجمتكِ الآن باتجاه ${direction}.`,detail:`${height}، حوالي ${degrees}° فوق الأفق.`};
}
