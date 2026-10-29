package at.rauso.app;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
 private static final String HOME="https://appassets.androidplatform.net/assets/index.html";
 private WebView web;
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
  settings.setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClient(){
   @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){
    return loader.shouldInterceptRequest(request.getUrl());
   }
  });
  setContentView(web);
  String target=authTarget(getIntent());
  if(state!=null && HOME.equals(target))web.restoreState(state);else web.loadUrl(target);
 }
 @Override protected void onNewIntent(Intent intent){
  super.onNewIntent(intent);
  setIntent(intent);
  if(web!=null && intent.getData()!=null)web.loadUrl(authTarget(intent));
 }
 @Override protected void onSaveInstanceState(Bundle out){if(web!=null)web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
