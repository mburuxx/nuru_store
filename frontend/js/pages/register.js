import { registerUser, getMe, roleToRoute } from "../api/users.js";
import { mount } from "../ui/dom.js";
import { toast } from "../ui/toast.js";
import { navigate } from "../router/router.js";

export function renderRegister(){
  mount(`
    <section class="card">
      <h2>Register</h2>
      <div class="grid">
        <label class="field">
          <span>Username</span>
          <input id="r_user" placeholder="username" autocomplete="username" />
        </label>
        <label class="field">
          <span>Email (optional)</span>
          <input id="r_email" placeholder="email@example.com" autocomplete="email" />
        </label>
        <label class="field">
          <span>Password</span>
          <input id="r_pass" type="password" placeholder="min 6 chars" autocomplete="new-password" />
        </label>
        <label class="field">
          <span>Phone (optional)</span>
          <input id="r_phone" placeholder="+254..." autocomplete="tel" />
        </label>
      </div>

      <div class="row">
        <button class="btn primary" id="r_btn">Create account</button>
        <a class="link" href="#/login">Already have an account?</a>
      </div>

      <p class="muted">
        New users become <b>CASHIER</b> by default (per your backend RegisterSerializer).
      </p>
    </section>
  `);

  document.getElementById("r_btn").addEventListener("click", async () => {
    try{
      const username = document.getElementById("r_user").value.trim();
      const email = document.getElementById("r_email").value.trim();
      const password = document.getElementById("r_pass").value;
      const phone = document.getElementById("r_phone").value.trim();

      const resp = await registerUser({ username, email, password, phone });
      toast(resp?.message || "Registered");

      const me = await getMe();
      navigate(roleToRoute(me));
    } catch(e){
      toast(String(e.message || e));
    }
  });
}