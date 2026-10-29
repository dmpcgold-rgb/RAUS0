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
import android.graphics.Color;
import android.view.WindowInsets;
import android.webkit.GeolocationPermissions;
import android.Manifest;
import android.content.pm.PackageManager;
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
 private static final int REQUEST_LOCATION_COARSE=4103;
 private GeolocationPermissions.Callback pendingGeoCallback;
 private String pendingGeoOrigin;
 private int systemBottomPx=0;
 private int systemTopPx=0;
 private void applyWebSafeArea(){
  if(web==null)return;
  final float density=getResources().getDisplayMetrics().density;
  final int bottomCss=Math.max(0,Math.round(systemBottomPx/Math.max(density,0.1f)));
  final int topCss=Math.max(0,Math.round(systemTopPx/Math.max(density,0.1f)));
  web.evaluateJavascript("(function(){document.documentElement.style.setProperty('--rauso-native-bottom','"+bottomCss+"px');document.documentElement.style.setProperty('--rauso-native-top','"+topCss+"px');})()",null);
 }

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
  // Android 15/16 enforce edge-to-edge. Explicitly request window insets
  // so RAUSO can place its content below system status/WLAN/battery icons.
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  getWindow().setStatusBarColor(Color.rgb(9,9,10));
  getWindow().setNavigationBarColor(Color.rgb(9,9,10));
  getWindow().getDecorView().setSystemUiVisibility(0);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web=new WebView(this);
  // Android shares text with apps chosen explicitly by the user.
  web.addJavascriptInterface(new Object(){
   @android.webkit.JavascriptInterface public void shareText(String text){
    if(text==null||text.length()==0||text.length()>1500)return;
    runOnUiThread(()->{Intent share=new Intent(Intent.ACTION_SEND);share.setType("text/plain");share.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(share,"Unternehmung teilen"));});
   }
  },"RAUSOShare");
  // Keep app content below Android's status bar (clock, signal and battery).
  web.setBackgroundColor(Color.rgb(9,9,10));
  web.setOnApplyWindowInsetsListener((view,insets)->{
   final int top;
   final int bottom;
   if(Build.VERSION.SDK_INT>=30){
    android.graphics.Insets safe=insets.getInsets(
      WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars());
    top=safe.top;bottom=safe.bottom;
   }else{
    top=insets.getSystemWindowInsetTop();
    bottom=insets.getSystemWindowInsetBottom();
   }
   // Android 15/16 enforce edge-to-edge. The web document must reserve
   // status bar and navigation bar insets without double-offsetting WebView.
   if(web.getPaddingTop()!=0 || web.getPaddingBottom()!=0){
    web.setPadding(0,0,0,0);
   }
   if(systemBottomPx!=bottom || systemTopPx!=top){
    systemTopPx=top;
    systemBottomPx=bottom;
    applyWebSafeArea();
   }
   return insets;
  });
  WebSettings settings=web.getSettings();
  settings.setGeolocationEnabled(true);
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);
  settings.setAllowContentAccess(true); // Required for user-selected content:// photo URIs.
  web.setWebViewClient(new WebViewClient(){
   @Override public void onPageFinished(WebView view,String url){
    super.onPageFinished(view,url);
    applyWebSafeArea();
   }
   @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){
    return loader.shouldInterceptRequest(request.getUrl());
   }
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){
    if(origin==null || !origin.startsWith("https://appassets.androidplatform.net")){
     callback.invoke(origin,false,false);return;
    }
    if(Build.VERSION.SDK_INT<23 || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){
     callback.invoke(origin,true,false);return;
    }
    pendingGeoOrigin=origin;pendingGeoCallback=callback;
    requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION},REQUEST_LOCATION_COARSE);
   }

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
  web.requestApplyInsets();
  if(Build.VERSION.SDK_INT>=33){
   androidBackCallback=()->navigateBackWithinRauso();
   getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
     OnBackInvokedDispatcher.PRIORITY_DEFAULT,androidBackCallback);
  }
  String target=authTarget(getIntent());
  if(state!=null && HOME.equals(target))web.restoreState(state);else web.loadUrl(target);
 }
 @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){
  super.onRequestPermissionsResult(requestCode,permissions,grantResults);
  if(requestCode==REQUEST_LOCATION_COARSE && pendingGeoCallback!=null){
   pendingGeoCallback.invoke(pendingGeoOrigin,
     grantResults.length>0 && grantResults[0]==PackageManager.PERMISSION_GRANTED,false);
   pendingGeoCallback=null;pendingGeoOrigin=null;
  }
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
 @Override protected void onResume(){super.onResume();if(web!=null)web.post(()->{web.requestApplyInsets();applyWebSafeArea();});}
 @Override protected void onSaveInstanceState(Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){
  if(Build.VERSION.SDK_INT>=33 && androidBackCallback!=null)
   getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(androidBackCallback);
  if(pendingGeoCallback!=null){pendingGeoCallback.invoke(pendingGeoOrigin,false,false);pendingGeoCallback=null;}
  if(photoPickerCallback!=null){photoPickerCallback.onReceiveValue(null);photoPickerCallback=null;}
  if(web!=null)web.destroy();
  super.onDestroy();
 }
}
