import { ArrowRightIcon, MailIcon } from "./icons";
import { LoginButton } from "./LoginButton";
import { getCompanyContactInfo } from "../lib/api/company";

export async function Closing() {
  const company = await getCompanyContactInfo();

  return (
    <section className="c-closing">
      <div className="c-wrap">
        <div className="c-closing-card">
          <h2>İdarəetmədə şəffaflıq</h2>
          <p>
            İdarəçi tam mənzərəni, mühasib dəqiq rəqəmləri, sakin isə öz borcunu və
            müraciətinin gedişatını görür.
          </p>
          <LoginButton className="c-btn c-btn-white">
            Daxil ol
            <span className="c-btn-arrow">
              <ArrowRightIcon size={16} />
            </span>
          </LoginButton>
          <a className="c-closing-contact" href={`mailto:${company.email}`}>
            <MailIcon size={14} />
            Bizimlə əlaqə
          </a>
        </div>
      </div>
    </section>
  );
}
