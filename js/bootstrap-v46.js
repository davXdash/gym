const styles=[
  'css/training-mode-v30.css?v=46',
  'css/coach-studio-v32.css?v=46',
  'css/studio-page-v35.css?v=46',
  'css/device-photo-v36.css?v=46',
  'css/stable-ui-v46.css?v=46'
];
for(const href of styles){
  if(!document.querySelector(`link[href="${href}"]`)){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    document.head.append(link);
  }
}
await import('./training-mode-v30.js?v=46');
await import('./coach-v31.js?v=46');
await import('./studio-page-v35.js?v=46');
await import('./device-photo-v36.js?v=46');
await import('./stable-ui-v46.js?v=46');
