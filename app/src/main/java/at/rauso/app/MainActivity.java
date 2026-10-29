package at.rauso.app;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.content.ActivityNotFoundException;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.webkit.WebSettings;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
 private static final String HOME="https://appassets.androidplatform.net/assets/index.html";
 private WebView web;
 private ValueCallback<Uri[]> photoPickerCallback;
 private static final int REQUEST_PHOTO_PICKER = 4102;
 private OnBackInvokedCallback androidBackCallback;
 private void navigateBackWithinRauso(){
  if(web==null)return;
  String current=web.getUrl();
  if(current==null){web.loadUrl(HOME);return;}
  if(!current.startsWith("https://appassets.androidplatform.net/assets/")){
   if(web.canGoBack())web.goBack();else web.loadUrl(HOME);
   return;
  }
  // Dialog > previous RAUSO tab > top of Discover. No Activity.finish().
  web.evaluateJavascript("window.RAUSO_BACK ? window.RAUSO_BACK() : false",null);
 }
 @SuppressWarnings("deprecation")
 @Override public void onBackPressed(){navigateBackWithinRauso();}

 private String authTarget(Intent intent) {
  Uri uri=intent==null?null:intent.getData();
  if(uri==null||!"rauso".equals(uri.getScheme())||!"auth".equals(uri.getHost())||!"/callback".equals(uri.getPath()))return HOME;
  StringBuilder url=new StringBuilder(HOME);
  String query=uri.getEncodedQuery();
  String fragment=uri.getEncodedFragment();
  if(query!=null&&!query.isEmpty())url.append('?').append(query);
  if(fragment!=null&&!fragment.isEmpty())url.append('#').append(fragment);
  return url.toString();
 }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web=new WebView(this);
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(true); // Required for user-selected content:// photo URIs.
  web.setWebViewClient(new WebViewClient(){
   @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){
    return loader.shouldInterceptRequest(request.getUrl());
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> uploadCallback,
       WebChromeClient.FileChooserParams params){
    if(photoPickerCallback!=null)photoPickerCallback.onReceiveValue(null);
    photoPickerCallback=uploadCallback;
    try{
     Intent pick=params.createIntent();
     pick.addCategory(Intent.CATEGORY_OPENABLE);
     startActivityForResult(pick,REQUEST_PHOTO_PICKER);
     return true;
    }catch(ActivityNotFoundException ex){
     photoPickerCallback=null;
     uploadCallback.onReceiveValue(null);
     return true;
    }
   }
  });
  setContentView(web);
  if(Build.VERSION.SDK_INT>=33){
   androidBackCallback=()->navigateBackWithinRauso();
   getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
     OnBackInvokedDispatcher.PRIORITY_DEFAULT,androidBackCallback);
  }
  String target=authTarget(getIntent());
  if(state!=null && HOME.equals(target))web.restoreState(state);else web.loadUrl(target);
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
  super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==REQUEST_PHOTO_PICKER){
   ValueCallback<Uri[]> callback=photoPickerCallback;
   photoPickerCallback=null;
   if(callback!=null)callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));
  }
 }
 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);
  setIntent(intent);
  if(web!=null && intent.getData()!=null)web.loadUrl(authTarget(intent));
 }
 @Override protected void onSaveInstanceState(Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){
  if(Build.VERSION.SDK_INT>=33 && androidBackCallback!=null)
   getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(androidBackCallback);
  if(photoPickerCallback!=null){photoPickerCallback.onReceiveValue(null);photoPickerCallback=null;}
  if(web!=null)web.destroy();
  super.onDestroy();
 }
}
