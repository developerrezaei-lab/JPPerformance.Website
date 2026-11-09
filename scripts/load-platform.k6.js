// Run only against an authorised staging instance with disposable accounts/data.
// k6 run -e JP_BASE_URL=https://staging.example -e JP_LOAD_USERS=./load-users.json scripts/load-platform.k6.js
// JSON: [{"email":"...","password":"..."}, ...]. Never commit this file.
import http from 'k6/http';
import { check, sleep } from 'k6';
import execution from 'k6/execution';
const users=JSON.parse(open(__ENV.JP_LOAD_USERS));
const base=__ENV.JP_BASE_URL;
if(!base||!users.length)throw new Error('Explicit staging URL and disposable accounts required');
export const options={stages:[{duration:'1m',target:10},{duration:'3m',target:50},{duration:'5m',target:100},{duration:'1m',target:0}],thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<500']}};
let ready=false,token;
export default function(){
 const user=users[(execution.vu.idInTest-1)%users.length];
 if(!ready){
  const csrf=http.get(base+'/api/v1/auth/csrf');token=csrf.json('token');
  const login=http.post(base+'/api/v1/auth/login?useCookies=true',JSON.stringify(user),{headers:{'Content-Type':'application/json','X-CSRF-TOKEN':token}});
  if(!check(login,{'login succeeds':r=>r.status===200})){sleep(10);return;}
  ready=true;
 }
 const response=http.get(base+'/api/v1/progress?days=90');check(response,{'own progress returns 200':r=>r.status===200});sleep(1);
}
