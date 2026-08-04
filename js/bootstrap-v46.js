const styles=[
  'css/training-mode-v30.css?v=47',
  'css/coach-studio-v32.css?v=47',
  'css/studio-page-v35.css?v=47',
  'css/device-photo-v36.css?v=47',
  'css/feature-v46.css?v=47'
];
for(const href of styles){
  if(!document.querySelector(`link[href="${href}"]`)){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    document.head.append(link);
  }
}
await import('./training-mode-v30.js?v=47');
await import('./coach-v31.js?v=47');
await import('./studio-page-v35.js?v=47');
await import('./device-photo-v36.js?v=47');
await import('./feature-v46.js?v=47');
