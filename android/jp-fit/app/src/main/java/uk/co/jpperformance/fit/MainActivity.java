package uk.co.jpperformance.fit;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/** رابط بومی و آفلاین؛ هیچ SDK تبلیغ، تحلیل رفتار یا مجوز شبکه‌ای اضافه نشده است. */
public final class MainActivity extends Activity {
    private WorkoutStore store;
    private SharedPreferences prefs;
    private boolean fa, dark;
    private int bg, surface, ink, muted, accent=Color.rgb(214,243,107);
    private String tab="today";
    private LinearLayout root, body;
    private TextView timerText;
    private Button timerButton;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private boolean visible;
    private static final int EXPORT=41;
    private static final String[][] MOVES={
        {"Goblet squat","اسکوات جام"},{"Dumbbell row","زیربغل دمبل"},
        {"Standing press","پرس سرشانه"},{"Push-up","شنا"},
        {"Bodyweight squat","اسکوات بدون وزنه"},{"Lunge","لانج"},
        {"Dumbbell curl","جلو بازو دمبل"},{"Custom movement","حرکت دلخواه"}
    };
    private final Runnable ticker=new Runnable(){@Override public void run(){updateTimer();if(visible) handler.postDelayed(this,250);}};
    private String t(String en,String persian){return fa?persian:en;}
    private int dp(float n){return Math.round(getResources().getDisplayMetrics().density*n);}
    private String number(double n){return java.math.BigDecimal.valueOf(n).stripTrailingZeros().toPlainString();}
    private void message(String value){Toast.makeText(this,value,Toast.LENGTH_SHORT).show();}

    @Override public void onCreate(Bundle state){
        super.onCreate(state);prefs=getSharedPreferences("preferences",MODE_PRIVATE);store=new WorkoutStore(this);
        if(state!=null)tab=state.getString("tab","today");
        render();
    }
    @Override protected void onStart(){super.onStart();visible=true;handler.post(ticker);}
    @Override protected void onStop(){visible=false;handler.removeCallbacks(ticker);super.onStop();}
    @Override protected void onDestroy(){handler.removeCallbacks(ticker);store.close();super.onDestroy();}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putString("tab",tab);}

    private GradientDrawable shape(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private TextView text(String value,int size,int color,boolean bold){
        TextView v=new TextView(this);v.setText(value);v.setTextColor(color);v.setTextSize(size);
        v.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        v.setTextDirection(fa?View.TEXT_DIRECTION_RTL:View.TEXT_DIRECTION_LTR);
        v.setPadding(0,dp(5),0,dp(5));return v;
    }
    private void addText(LinearLayout box,String value,int size,int color,boolean bold){box.addView(text(value,size,color,bold));}
    private LinearLayout column(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.VERTICAL);return v;}
    private LinearLayout row(){LinearLayout v=new LinearLayout(this);v.setGravity(Gravity.CENTER_VERTICAL);v.setOrientation(LinearLayout.HORIZONTAL);return v;}
    private void space(LinearLayout box,int height){View v=new View(this);box.addView(v,new LinearLayout.LayoutParams(1,dp(height)));}
    private LinearLayout card(){
        LinearLayout v=column();v.setPadding(dp(20),dp(18),dp(20),dp(18));v.setBackground(shape(surface,22));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.bottomMargin=dp(14);body.addView(v,lp);return v;
    }
    private Button button(String title,boolean primary,Runnable action){
        Button v=new Button(this);v.setText(title);v.setAllCaps(false);v.setTextSize(14);v.setMinHeight(dp(48));
        v.setTextColor(primary?Color.rgb(24,31,19):ink);v.setBackground(shape(primary?accent:surface,12));
        v.setOnClickListener(x->action.run());return v;
    }
    private void fullButton(LinearLayout box,String title,boolean primary,Runnable action){
        Button b=button(title,primary,action);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(10);box.addView(b,lp);
    }
    private void confirm(String title,String detail,Runnable action){
        new AlertDialog.Builder(this).setTitle(title).setMessage(detail)
            .setNegativeButton(t("Cancel","انصراف"),null)
            .setPositiveButton(t("Confirm","تأیید"),(d,w)->action.run()).show();
    }
    private void render(){
        String language=prefs.getString("language","en");fa=language.equals("fa");
        String theme=prefs.getString("theme","dark");dark=theme.equals("dark")||(theme.equals("system")&&(getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES);
        bg=Color.parseColor(dark?"#111810":"#F6F8F0");surface=Color.parseColor(dark?"#202B1D":"#FFFFFF");
        ink=Color.parseColor(dark?"#F4F8EF":"#182117");muted=Color.parseColor(dark?"#B1BFA7":"#606D57");
        timerText=null;timerButton=null;
        root=column();root.setBackgroundColor(bg);root.setLayoutDirection(fa?View.LAYOUT_DIRECTION_RTL:View.LAYOUT_DIRECTION_LTR);
        setContentView(root);
        // حاشیه‌های سیستم و صفحه‌کلید در Android 16 رعایت می‌شوند.
        root.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });root.requestApplyInsets();
        if(Build.VERSION.SDK_INT>=30 && getWindow().getInsetsController()!=null)getWindow().getInsetsController().setSystemBarsAppearance(dark?0:android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
        LinearLayout header=row();header.setPadding(dp(24),dp(14),dp(24),dp(10));
        TextView brand=text("JP FIT",23,ink,true);header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        header.addView(text(t("YOUR EVERYDAY PROGRESS","پیشرفت هر روز تو"),10,muted,false));root.addView(header);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);body=column();body.setPadding(dp(22),dp(12),dp(22),dp(24));scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        switch(tab){case "history":history();break;case "progress":progress();break;case "settings":settings();break;default:today();}
        LinearLayout nav=row();nav.setPadding(dp(10),dp(8),dp(10),dp(8));
        String[] keys={"today","history","progress","settings"};String[] en={"Today","History","Progress","Settings"},pe={"امروز","تاریخچه","پیشرفت","تنظیمات"};
        for(int i=0;i<keys.length;i++){final String key=keys[i];Button b=button(t(en[i],pe[i]),tab.equals(key),()->{tab=key;render();});b.setTextSize(11);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(50),1);p.setMargins(dp(3),0,dp(3),0);nav.addView(b,p);}
        root.addView(nav);updateTimer();
    }
    private void heading(String eyebrow,String title,String detail){addText(body,eyebrow,11,muted,true);addText(body,title,34,ink,true);addText(body,detail,14,muted,false);space(body,20);}
    private void today(){
        long active=store.activeId();List<WorkoutStore.SetEntry> sets=store.sets(active);
        heading(t("ONE SET AT A TIME","یک ست در هر قدم"),t("Make room\nfor movement.","برای حرکت\nوقت بگذار."),t("Your workout. Your pace. Your progress.","تمرین تو، با سرعت و پیشرفت خودت."));
        if(active==0){LinearLayout c=card();addText(c,t("A fresh start","یک شروع تازه"),23,ink,true);addText(c,t("Create a session and log the movements you choose.","یک جلسه بساز و حرکت‌های دلخواهت را ثبت کن."),14,muted,false);fullButton(c,t("Start a session","شروع جلسه"),true,()->{store.begin();render();});}
        else {
            LinearLayout summary=card();addText(summary,t("CURRENT SESSION","جلسهٔ جاری"),11,muted,true);addText(summary,sets.size()+t(" sets logged"," ست ثبت‌شده"),27,ink,true);
            fullButton(summary,t("+ Add a set","+ افزودن ست"),true,()->editSet(null));
            if(!sets.isEmpty()){
                fullButton(summary,t("Finish session","پایان جلسه"),false,()->confirm(t("Finish this session?","جلسه تمام شود؟"),t("Your logged sets will be saved in history.","ست‌های ثبت‌شده در تاریخچه ذخیره می‌شوند."),()->{store.finish(active);resetTimer();render();}));
                for(WorkoutStore.SetEntry e:sets){LinearLayout c=card();addText(c,e.name,20,ink,true);addText(c,e.reps+t(" reps · "," تکرار · ")+number(e.weight)+t(" kg"," کیلوگرم"),14,muted,false);
                    LinearLayout actions=row();Button edit=button(t("Edit","ویرایش"),false,()->editSet(e));Button remove=button(t("Remove","حذف"),false,()->confirm(t("Remove set?","ست حذف شود؟"),e.name,()->{store.removeSet(e.id);render();}));
                    actions.addView(edit,new LinearLayout.LayoutParams(0,-2,1));actions.addView(remove,new LinearLayout.LayoutParams(0,-2,1));c.addView(actions);}
            }
            fullButton(body,t("Discard current session","حذف جلسهٔ جاری"),false,()->confirm(t("Discard session?","جلسه حذف شود؟"),t("All sets in this unfinished session will be deleted.","همهٔ ست‌های این جلسهٔ ناتمام حذف می‌شوند."),()->{store.removeSession(active);resetTimer();render();}));space(body,16);
        }
        timerCard();
        addText(body,t("JP Fit is a workout journal, not personalised training or medical advice.","JP Fit دفتر ثبت تمرین است؛ برنامهٔ تمرینی شخصی یا توصیهٔ پزشکی ارائه نمی‌دهد."),11,muted,false);
    }
    private void editSet(WorkoutStore.SetEntry entry){
        LinearLayout fields=column();fields.setPadding(dp(24),dp(12),dp(24),dp(8));fields.setLayoutDirection(fa?View.LAYOUT_DIRECTION_RTL:View.LAYOUT_DIRECTION_LTR);
        String[] names=new String[MOVES.length];for(int i=0;i<names.length;i++)names[i]=MOVES[i][fa?1:0];
        Spinner movement=new Spinner(this);ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,names);movement.setAdapter(adapter);
        addText(fields,t("Movement","حرکت"),13,muted,true);fields.addView(movement);
        EditText custom=new EditText(this);custom.setHint(t("Custom movement (optional)","نام حرکت دلخواه (اختیاری)"));custom.setSingleLine(true);fields.addView(custom);
        if(entry!=null){boolean matched=false;for(int i=0;i<MOVES.length-1;i++)if(entry.name.equals(MOVES[i][0])||entry.name.equals(MOVES[i][1])){movement.setSelection(i);matched=true;break;}if(!matched){movement.setSelection(names.length-1);custom.setText(entry.name);}}
        else if(prefs.contains("last_movement")){movement.setSelection(Math.min(names.length-1,prefs.getInt("last_movement",0)));custom.setText(prefs.getString("last_custom",""));}
        addText(fields,t("Reps (1–500)","تکرار (۱ تا ۵۰۰)"),13,muted,true);
        EditText reps=new EditText(this);reps.setSingleLine(true);reps.setInputType(InputType.TYPE_CLASS_NUMBER);reps.setText(entry==null?prefs.getString("last_reps","10"):""+entry.reps);fields.addView(reps);
        addText(fields,t("Weight in kg (0 for bodyweight)","وزن به کیلوگرم (برای وزن بدن صفر)"),13,muted,true);
        EditText weight=new EditText(this);weight.setSingleLine(true);weight.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);weight.setText(entry==null?prefs.getString("last_weight","0"):number(entry.weight));fields.addView(weight);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Log your set","ثبت ست"))
            .setView(fields).setNegativeButton(t("Cancel","انصراف"),null).setPositiveButton(t("Save set","ذخیرهٔ ست"),null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try{
                String customName=custom.getText().toString().trim();int selected=movement.getSelectedItemPosition();
                String name=WorkoutRules.movement(customName.isEmpty()?(selected==MOVES.length-1?"":names[selected]):customName);
                int r=WorkoutRules.reps(reps.getText().toString());double w=WorkoutRules.weight(weight.getText().toString());
                store.saveSet(entry==null?0:entry.id,store.activeId(),name,r,w);
                prefs.edit().putInt("last_movement",selected).putString("last_custom",customName).putString("last_reps",""+r).putString("last_weight",number(w)).apply();
                dialog.dismiss();render();
            }catch(IllegalArgumentException ex){message(t("Enter a movement, 1–500 reps and a weight from 0 to 1000 kg.","نام حرکت، تکرار ۱ تا ۵۰۰ و وزن صفر تا ۱۰۰۰ کیلوگرم را وارد کن."));}
            catch(IllegalStateException ex){dialog.dismiss();render();message(t("Session changed. Please try again.","جلسه تغییر کرده است؛ دوباره تلاش کن."));}
        }));dialog.show();
    }
    private void timerCard(){
        LinearLayout c=card();addText(c,t("TIME TO RECOVER","زمان استراحت"),11,muted,true);
        timerText=text("",42,ink,true);c.addView(timerText);
        int duration=prefs.getInt("rest_seconds",60);
        Button durationButton=button(t("Duration: ","مدت: ")+duration+t(" seconds"," ثانیه"),false,()->{
            String[] choices={"30","60","90","120","180"};new AlertDialog.Builder(this).setTitle(t("Rest duration","مدت استراحت")).setItems(choices,(d,w)->{prefs.edit().putInt("rest_seconds",Integer.parseInt(choices[w])).putLong("timer_end",0).remove("timer_paused").apply();render();}).show();
        });c.addView(durationButton);
        timerButton=button("",true,()->{
            long end=prefs.getLong("timer_end",0);long remaining=WorkoutRules.remaining(end,System.currentTimeMillis());
            if(end>0&&remaining>0)prefs.edit().putLong("timer_end",0).putLong("timer_paused",remaining).apply();
            else {long seconds=prefs.getLong("timer_paused",prefs.getInt("rest_seconds",60));if(seconds<=0)seconds=prefs.getInt("rest_seconds",60);prefs.edit().putLong("timer_end",System.currentTimeMillis()+seconds*1000).remove("timer_paused").apply();}
            updateTimer();
        });c.addView(timerButton);fullButton(c,t("Reset timer","بازنشانی تایمر"),false,()->{resetTimer();updateTimer();});
        addText(c,t("The countdown resumes when you return. Background sound notifications are not included in this version.","شمارش با بازگشت به اپ به‌روز می‌شود. این نسخه اعلان صوتی در پس‌زمینه ندارد."),11,muted,false);
    }
    private void resetTimer(){prefs.edit().putLong("timer_end",0).remove("timer_paused").apply();}
    private void updateTimer(){
        long end=prefs.getLong("timer_end",0);long seconds=end>0?WorkoutRules.remaining(end,System.currentTimeMillis()):prefs.getLong("timer_paused",prefs.getInt("rest_seconds",60));
        if(end>0&&seconds==0){prefs.edit().putLong("timer_end",0).putLong("timer_paused",0).apply();if(visible)message(t("Rest complete","استراحت تمام شد"));}
        if(timerText!=null)timerText.setText(String.format(Locale.US,"%02d:%02d",seconds/60,seconds%60));
        if(timerButton!=null)timerButton.setText(end>0&&seconds>0?t("Pause","مکث"):seconds==0?t("Restart","شروع دوباره"):prefs.contains("timer_paused")?t("Resume","ادامه"):t("Start rest","شروع استراحت"));
    }
    private String date(long millis){return DateFormat.getDateTimeInstance(DateFormat.MEDIUM,DateFormat.SHORT,fa?Locale.forLanguageTag("fa"):Locale.UK).format(new Date(millis));}
    private void history(){
        List<WorkoutStore.Session> sessions=store.sessions(false);
        heading(t("YOUR WORK, REMEMBERED","تلاش‌های ثبت‌شدهٔ تو"),t("Every session\ncounts.","هر جلسه\nارزشمند است."),t("Tap a session to review its sets.","برای دیدن ست‌ها یک جلسه را انتخاب کن."));
        if(sessions.isEmpty())addText(body,t("Finish your first session to see it here.","اولین جلسه را تمام کن تا اینجا نمایش داده شود."),16,muted,false);
        for(WorkoutStore.Session s:sessions){LinearLayout c=card();addText(c,date(s.started),18,ink,true);addText(c,s.count+t(" sets · "," ست · ")+number(s.volume)+t(" kg volume"," کیلوگرم حجم تمرین"),13,muted,false);
            fullButton(c,t("View session","مشاهدهٔ جلسه"),false,()->sessionDetails(s));}
    }
    private void sessionDetails(WorkoutStore.Session session){
        StringBuilder details=new StringBuilder();for(WorkoutStore.SetEntry e:store.sets(session.id))details.append(e.name).append("\n").append(e.reps).append(t(" reps · "," تکرار · ")).append(number(e.weight)).append(t(" kg\n\n"," کیلوگرم\n\n"));
        ScrollView scroll=new ScrollView(this);TextView content=text(details.toString(),16,Color.WHITE,false);content.setPadding(dp(24),dp(12),dp(24),dp(12));scroll.addView(content);
        new AlertDialog.Builder(this).setTitle(date(session.started)).setView(scroll).setPositiveButton(t("Close","بستن"),null).setNeutralButton(t("Delete session","حذف جلسه"),(d,w)->confirm(t("Delete saved session?","جلسهٔ ذخیره‌شده حذف شود؟"),t("This cannot be undone inside the app.","این کار درون برنامه قابل بازگشت نیست."),()->{store.removeSession(session.id);render();})).show();
    }
    private void progress(){
        List<WorkoutStore.Session> sessions=store.sessions(false);int total=0;double volume=0;for(WorkoutStore.Session s:sessions){total+=s.count;volume+=s.volume;}
        heading(t("CONSISTENCY, MADE VISIBLE","تداوم قابل مشاهده"),t("Your progress,\nat a glance.","پیشرفت تو\nدر یک نگاه."),t("A summary of the sessions you have completed.","خلاصهٔ جلسه‌هایی که تمام کرده‌ای."));
        LinearLayout c=card();addText(c,""+sessions.size(),42,accent,true);addText(c,t("completed sessions","جلسهٔ کامل‌شده"),14,muted,false);addText(c,total+t(" logged sets"," ست ثبت‌شده"),22,ink,true);addText(c,number(volume)+t(" kg total volume"," کیلوگرم حجم کل تمرین"),18,ink,false);
        addText(body,t("LAST 7 SESSIONS · VOLUME","۷ جلسهٔ اخیر · حجم تمرین"),12,muted,true);
        double max=1;for(int i=0;i<Math.min(7,sessions.size());i++)max=Math.max(max,sessions.get(i).volume);
        for(int i=Math.min(7,sessions.size())-1;i>=0;i--){WorkoutStore.Session s=sessions.get(i);LinearLayout item=card();addText(item,DateFormat.getDateInstance(DateFormat.SHORT).format(new Date(s.started))+" · "+number(s.volume)+" kg",13,ink,false);LinearLayout track=row();track.setBackground(shape(dark?0xff35432e:0xffe9efdf,5));View fill=new View(this);fill.setBackground(shape(dark?accent:0xff648326,5));float fraction=(float)Math.max(.01,s.volume/max);track.addView(fill,new LinearLayout.LayoutParams(0,dp(9),fraction));track.addView(new View(this),new LinearLayout.LayoutParams(0,dp(9),1-fraction));item.addView(track);}
        addText(body,t("Volume = reps × logged weight. Bodyweight sets count as sets but add zero weighted volume. This is a record, not a measure of health or a comparison between different exercises.","حجم تمرین برابر تکرار × وزن ثبت‌شده است. ست‌های وزن بدن شمرده می‌شوند اما حجم وزنهٔ صفر دارند. این فقط گزارش است، نه سنجش سلامت یا معیار مقایسهٔ حرکت‌های متفاوت."),12,muted,false);
    }
    private void settings(){
        heading(t("MAKE IT YOURS","به سبک خودت"),t("Simple by design.","سادگی در طراحی."),t("Your training journal stays on this device.","دفتر تمرین تو روی همین دستگاه می‌ماند."));
        LinearLayout c=card();fullButton(c,t("Language: English / فارسی","زبان: فارسی / English"),false,()->new AlertDialog.Builder(this).setTitle("Language / زبان").setItems(new String[]{"English","فارسی"},(d,w)->{prefs.edit().putString("language",w==0?"en":"fa").apply();render();}).show());
        fullButton(c,t("Appearance","ظاهر برنامه"),false,()->new AlertDialog.Builder(this).setTitle(t("Appearance","ظاهر برنامه")).setItems(new String[]{t("Dark","تاریک"),t("Light","روشن"),t("System","سیستم")},(d,w)->{prefs.edit().putString("theme",new String[]{"dark","light","system"}[w]).apply();render();}).show());
        LinearLayout data=card();addText(data,t("YOUR DATA","اطلاعات تو"),12,muted,true);
        fullButton(data,t("Export workout data (JSON)","خروجی اطلاعات تمرین (JSON)"),true,()->{try{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"jp-fit-workouts.json");startActivityForResult(intent,EXPORT);}catch(android.content.ActivityNotFoundException ex){message(t("No document provider is available.","برنامهٔ مدیریت فایل در دسترس نیست."));}});
        addText(data,t("Exports may include personal exercise records. Choose where to save them. Import is planned for a later version.","فایل خروجی شامل اطلاعات تمرین توست؛ محل ذخیره را خودت انتخاب کن. بازیابی فایل برای نسخهٔ بعدی برنامه‌ریزی شده است."),12,muted,false);
        fullButton(data,t("Privacy information","حریم خصوصی"),false,()->new AlertDialog.Builder(this).setTitle(t("Your privacy","حریم خصوصی تو")).setMessage(t("JP Fit 0.1.0 stores workout entries and settings in this app’s private storage. There is no account, advertising, analytics SDK, Health Connect access or network permission. We do not receive your workout records. Export uses the document provider you choose; that provider may store a copy. Android backup and device transfer are excluded by the app configuration. Deleting the app removes its local records; exported copies remain where you saved them. You can delete workout records below. JP PERFORMANCE LTD, company 17542449, Unit 2 Cavendish Retail Park, Keighley, BD21 3RB, UK. Company email: info@jpperformance.co.uk (email setup is still pending for this development build).", "نسخهٔ ۰٫۱٫۰ اطلاعات تمرین و تنظیمات را در فضای خصوصی همین برنامه ذخیره می‌کند. حساب کاربری، تبلیغات، SDK تحلیل رفتار، دسترسی Health Connect یا مجوز شبکه ندارد. ما اطلاعات تمرین تو را دریافت نمی‌کنیم. خروجی با برنامهٔ مدیریت فایل انتخابی تو ذخیره می‌شود و ممکن است آن ارائه‌دهنده یک نسخه نگه دارد. در تنظیمات برنامه، پشتیبان‌گیری اندروید و انتقال دستگاه مستثنا شده‌اند. با حذف برنامه، اطلاعات محلی پاک می‌شوند؛ فایل‌های خروجی در محل ذخیره باقی می‌مانند. پایین همین صفحه می‌توانی اطلاعات تمرین را حذف کنی. ناشر JP PERFORMANCE LTD، شمارهٔ شرکت 17542449، آدرس Unit 2 Cavendish Retail Park, Keighley, BD21 3RB, UK است. نشانی info@jpperformance.co.uk هنوز در این نسخهٔ توسعه در حال راه‌اندازی است.")).setPositiveButton(t("Close","بستن"),null).show());
        fullButton(data,t("Delete all workout records","حذف همهٔ اطلاعات تمرین"),false,()->confirm(t("Delete all workout records?","همهٔ اطلاعات تمرین حذف شوند؟"),t("Current and completed sessions will be permanently deleted. Exported files are not deleted. Export first if you want to keep a copy.","جلسهٔ جاری و جلسه‌های کامل‌شده برای همیشه حذف می‌شوند. فایل‌های خروجی حذف نمی‌شوند. اگر نسخه‌ای لازم داری، اول خروجی بگیر."),()->{store.clear();prefs.edit().remove("last_movement").remove("last_custom").remove("last_reps").remove("last_weight").apply();resetTimer();render();message(t("Workout records deleted","اطلاعات تمرین حذف شدند"));}));
        addText(body,"JP PERFORMANCE LTD · JP Fit 0.1.0",12,muted,false);
        addText(body,t("Development build. Not yet published on Google Play.","نسخهٔ توسعه؛ هنوز در گوگل‌پلی منتشر نشده است."),12,muted,false);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==EXPORT&&result==RESULT_OK&&data!=null&&data.getData()!=null){
            Uri destination=data.getData();
            try(OutputStream out=getContentResolver().openOutputStream(destination,"wt")){
                if(out==null)throw new java.io.IOException("No output stream");out.write(store.exportJson().getBytes(StandardCharsets.UTF_8));message(t("Export saved","فایل خروجی ذخیره شد"));
            }catch(Exception ex){message(t("Export failed. Please choose another location.","خروجی ذخیره نشد؛ محل دیگری انتخاب کن."));}
        }
    }
}
