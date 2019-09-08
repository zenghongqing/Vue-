let vm = new Vue({
    el: '#app',
    template:
    `<div>
        <p>{{a}}</p>
        <p>{{b}}</p>
        <div :class="a">btn1</div>
        <div @click="plus()">btn2</div>
        <div>
            <div>
                <div>str1</div>
                <div>str2</div>
            </div>
            <div>str3</div>
        </div>
        </div>`,
    data () {
        return {
            a: 1,
            b: 2
        }
    }
})