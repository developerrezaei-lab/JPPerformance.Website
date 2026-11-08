"""Validate the app's actual schema using host SQLite (not an Android runtime test)."""
import re
import sqlite3
from pathlib import Path

source = (Path(__file__).resolve().parents[1] / 'app/src/main/java/uk/co/jpperformance/fit/WorkoutStore.java').read_text()
db = sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for sql in re.findall(r'db\.execSQL\("([^"]+)"\)', source):
    db.execute(sql)

def rejected(sql):
    try:
        db.execute(sql)
    except sqlite3.IntegrityError:
        return
    raise AssertionError('Constraint not enforced: ' + sql)

db.execute('INSERT INTO sessions(id,started) VALUES(1,1000)')
rejected('INSERT INTO sessions(id,started) VALUES(2,2000)')
rejected("INSERT INTO sets(session_id,name,reps,weight) VALUES(999,'squat',10,8)")
rejected("INSERT INTO sets(session_id,name,reps,weight) VALUES(1,'squat',0,8)")
rejected("INSERT INTO sets(session_id,name,reps,weight) VALUES(1,'squat',10,-1)")
db.execute("INSERT INTO sets(session_id,name,reps,weight) VALUES(1,'اسکوات',10,12.5)")
db.execute("INSERT INTO sets(session_id,name,reps,weight) VALUES(1,'Push-up',12,0)")
assert db.execute('SELECT COUNT(*),SUM(reps*weight) FROM sets').fetchone() == (2,125)
db.execute('UPDATE sets SET reps=8 WHERE id=1')
assert db.execute('SELECT SUM(reps*weight) FROM sets').fetchone()[0] == 100
db.execute('UPDATE sessions SET finished=3000 WHERE id=1')
db.execute('INSERT INTO sessions(id,started) VALUES(2,4000)')
assert db.execute('SELECT COUNT(*) FROM sessions WHERE finished=0').fetchone()[0] == 1
db.execute('DELETE FROM sessions WHERE id=1')
assert db.execute('SELECT COUNT(*) FROM sets').fetchone()[0] == 0
assert db.execute('SELECT id FROM sessions').fetchone()[0] == 2
print('PASS: session lifecycle, active-session uniqueness, constraints, volume and cascading deletion')
