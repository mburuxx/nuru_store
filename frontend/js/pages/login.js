import { login } from "../api/client.js";
import { getMe } from "../api/users.js";
import { mount } from "../ui/dom.js";
import { toast } from "../ui/toast.js";
import { navigate } from "../router/router.js";
import { roleToRoute } from "../api/users.js";

export function renderLogin(){
  mount(`
    <section class="card">
      <h2>Login</h2>
      <div class="grid">
        <label class="field">
          <span>Username</span>
          <input id="l_user" placeholder="username" autocomplete="username" />
        </label>
        <label class="field">
          <span>Password</span>
          <input id="l_pass" type="password" placeholder="password" autocomplete="current-password" />
        </label>
      </div>
      <div class="row">
        <button class="btn primary" id="l_btn">Login</button>
        <a class="link" href="#/register">Create account</a>
      </div>
      <p class="muted">After login you’ll be routed based on your role.</p>
    </section>
  `);

  document.getElementById("l_btn").addEventListener("click", async () => {
    try{
      const username = document.getElementById("l_user").value.trim();
      const password = document.getElementById("l_pass").value;

      await login(username, password);

      const me = await getMe();
      toast(`Welcome, ${me.username}`);
      navigate(roleToRoute(me));
    } catch(e){
      toast(String(e.message || e));
    }
  });
}