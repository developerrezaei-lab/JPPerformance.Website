package uk.co.jpperformance.fit;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/** اطلاعات تمرین فقط در SQLite خصوصی برنامه ذخیره می‌شود. */
final class WorkoutStore extends SQLiteOpenHelper {
    static final class SetEntry {
        long id, sessionId; String name; int reps; double weight;
    }
    static final class Session {
        long id, started, finished; int count; double volume;
    }
    WorkoutStore(Context context) { super(context, "jpfit.db", null, 1); }
    @Override public void onConfigure(SQLiteDatabase db) { db.setForeignKeyConstraintsEnabled(true); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE sessions (id INTEGER PRIMARY KEY, started INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0)");
        db.execSQL("CREATE UNIQUE INDEX one_active_session ON sessions(finished) WHERE finished=0");
        db.execSQL("CREATE TABLE sets (id INTEGER PRIMARY KEY, session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, name TEXT NOT NULL, reps INTEGER NOT NULL CHECK(reps BETWEEN 1 AND 500), weight REAL NOT NULL CHECK(weight BETWEEN 0 AND 1000))");
        db.execSQL("CREATE INDEX sets_by_session ON sets(session_id)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int old, int next) { throw new IllegalStateException("Migration required"); }
    long activeId() {
        try (Cursor c=getReadableDatabase().rawQuery("SELECT id FROM sessions WHERE finished=0 LIMIT 1",null)) { return c.moveToFirst()?c.getLong(0):0; }
    }
    long begin() {
        long id=activeId(); if(id!=0) return id;
        ContentValues v=new ContentValues();v.put("started",System.currentTimeMillis());
        return getWritableDatabase().insertOrThrow("sessions",null,v);
    }
    void saveSet(long editId, long sessionId, String name, int reps, double weight) {
        WorkoutRules.movement(name); WorkoutRules.reps(String.valueOf(reps)); WorkoutRules.weight(String.valueOf(weight));
        SQLiteDatabase db=getWritableDatabase();
        db.beginTransaction();
        try {
            if(sessionId==0 || sessionId!=activeId()) throw new IllegalStateException("No active session");
            ContentValues v=new ContentValues();v.put("session_id",sessionId);v.put("name",name);v.put("reps",reps);v.put("weight",weight);
            if(editId==0) db.insertOrThrow("sets",null,v);
            else if(db.update("sets",v,"id=? AND session_id=?",new String[]{""+editId,""+sessionId})!=1) throw new IllegalStateException("Set missing");
            db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
    }
    List<SetEntry> sets(long sessionId) {
        List<SetEntry> out=new ArrayList<>();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,session_id,name,reps,weight FROM sets WHERE session_id=? ORDER BY id",new String[]{""+sessionId})) {
            while(c.moveToNext()) {SetEntry s=new SetEntry();s.id=c.getLong(0);s.sessionId=c.getLong(1);s.name=c.getString(2);s.reps=c.getInt(3);s.weight=c.getDouble(4);out.add(s);}
        }
        return out;
    }
    void removeSet(long id) { getWritableDatabase().delete("sets","id=? AND session_id IN (SELECT id FROM sessions WHERE finished=0)",new String[]{""+id}); }
    void finish(long id) {
        if(sets(id).isEmpty()) throw new IllegalStateException("Empty session");
        ContentValues v=new ContentValues();v.put("finished",System.currentTimeMillis());
        getWritableDatabase().update("sessions",v,"id=? AND finished=0",new String[]{""+id});
    }
    void removeSession(long id) {getWritableDatabase().delete("sessions","id=?",new String[]{""+id});}
    List<Session> sessions(boolean includeActive) {
        List<Session> out=new ArrayList<>();
        String sql="SELECT s.id,s.started,s.finished,COUNT(t.id),COALESCE(SUM(t.reps*t.weight),0) FROM sessions s LEFT JOIN sets t ON t.session_id=s.id"+(includeActive?"":" WHERE s.finished>0")+" GROUP BY s.id ORDER BY s.started DESC";
        try(Cursor c=getReadableDatabase().rawQuery(sql,null)) {
            while(c.moveToNext()){Session s=new Session();s.id=c.getLong(0);s.started=c.getLong(1);s.finished=c.getLong(2);s.count=c.getInt(3);s.volume=c.getDouble(4);out.add(s);}
        }
        return out;
    }
    String exportJson() throws JSONException {
        JSONArray sessions=new JSONArray();
        for(Session s:sessions(true)) {
            JSONArray entries=new JSONArray();
            for(SetEntry e:sets(s.id)) entries.put(new JSONObject().put("movement",e.name).put("reps",e.reps).put("weightKg",e.weight));
            sessions.put(new JSONObject().put("startedAt",s.started).put("finishedAt",s.finished).put("sets",entries));
        }
        return new JSONObject().put("format","jpfit-export").put("version",1).put("exportedAt",System.currentTimeMillis()).put("sessions",sessions).toString(2);
    }
    void clear() {
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try{db.delete("sessions",null,null);db.setTransactionSuccessful();}finally{db.endTransaction();}
    }
}
