<template>
  <div class="sidebar">
    <el-menu :default-active="activeMenu" router>
      <el-menu-item v-for="route in menuRoutes" :key="route.path" :index="'/' + route.path">
        <i :class="'el-icon-' + route.meta.icon"></i>
        <span>{{ route.meta.title }}</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  computed: {
    menuRoutes() {
      const layoutRoute = this.$router.options.routes.find(r => r.path === '/')
      return layoutRoute ? layoutRoute.children : []
    },
    activeMenu() {
      return this.$route.path
    }
  }
}
</script>

<style lang="scss" scoped>
.sidebar { height: 100%; }
.el-menu { border-right: none !important; }
::v-deep .el-menu-item.is-active {
  background: rgba(86, 118, 230, 0.26) !important;
  border-right: 3px solid #1890ff;
}
</style>
