class CRM {
    constructor(subdomain) {
        this.subdomain = subdomain;
    }

    async getContacts(options) {
        // Генерация строки запроса
        let getContactsListQueryUrl = `https://${this.subdomain}.amocrm.ru/api/v4/contacts?`;
        for (let key in options) {
            getContactsListQueryUrl += `${key}=${options[key]}&`;
        }
    
        // Постраничная выгрузка контактов
        let contacts = [];
        let page = 1;
        while(true) {
            let response = await fetch(getContactsListQueryUrl + `page=${page}`);
    
            if (response.ok) {
                if (response.statusText !== 'OK') break;
    
                let data = await response.json();
                let currentPage = data._embedded.contacts;
    
                contacts = [...contacts, ...currentPage];
                
                if (currentPage.length < options.limit) break;
    
                ++page;
            } else {
                break;
            }
        }
    
        this.contacts = contacts;
        return this;
    }

    async extractEmptyContactsIds() {
        const contactsWithoutLeads = [];
        this.contacts.forEach(contact => {
            if (contact._embedded.leads.length === 0) {
                contactsWithoutLeads.push(contact.id);
            }
        });

        this.contacts = contactsWithoutLeads;
        return this;
    }

    async makeTasks({ 
        task_type_id = 1, 
        text = '', 
        entity_type = 'contacts', 
        complete_till = Date.now() + 3600 * 24
    }) {
        // Генерация строки запроса
        let makeTaskUrl = `https://${this.subdomain}.amocrm.ru/api/v4/tasks`;
        
        // Компановка задач
        const tasks = [];
        this.contacts.forEach(async contact => {
            tasks.push({
                    task_type_id: task_type_id,
                    text: text,
                    entity_id: contact,
                    entity_type: entity_type,
                    complete_till: complete_till
                }
            )
        });

        // Отправка запроса на создание задач
        let response = await fetch(makeTaskUrl, {
            "Content-Type": "application/json",
            "method": "POST",
            "body": JSON.stringify(tasks),
        });
        
        return this;
    }
}



const crm = new CRM('safuanovruslanw');
await crm.getContacts({
    limit: 7,
    with: 'leads'
});
await crm.extractEmptyContactsIds();
await crm.makeTasks({
    text: 'Контакт без сделок'
});