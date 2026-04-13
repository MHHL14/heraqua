<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Cron;

use Herqua\Schoenadviseur\Cron\RebuildProducts;
use Herqua\Schoenadviseur\Model\Config;
use Herqua\Schoenadviseur\Model\DirtyFlag;
use Herqua\Schoenadviseur\Model\ProductExporter;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

final class RebuildProductsTest extends TestCase
{
    public function testSkipsWhenDisabled(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('isEnabled')->willReturn(false);

        $exporter = $this->createMock(ProductExporter::class);
        $exporter->expects($this->never())->method('rebuild');

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $cron = new RebuildProducts($config, $exporter, $dirtyFlag, new NullLogger());
        $cron->execute();
    }

    public function testSkipsWhenScrapingMode(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('isEnabled')->willReturn(true);
        $config->method('getDataSource')->willReturn('scraping');

        $exporter = $this->createMock(ProductExporter::class);
        $exporter->expects($this->never())->method('rebuild');

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $cron = new RebuildProducts($config, $exporter, $dirtyFlag, new NullLogger());
        $cron->execute();
    }

    public function testRebuildsWhenApiMode(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('isEnabled')->willReturn(true);
        $config->method('getDataSource')->willReturn('magento_api');

        $exporter = $this->createMock(ProductExporter::class);
        $exporter->expects($this->once())->method('rebuild')->willReturn(42);

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $cron = new RebuildProducts($config, $exporter, $dirtyFlag, new NullLogger());
        $cron->execute();
    }

    public function testClearsDirtyFlagAfterSuccessfulRebuild(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('isEnabled')->willReturn(true);
        $config->method('getDataSource')->willReturn('magento_api');

        $exporter = $this->createMock(ProductExporter::class);
        $exporter->method('rebuild')->willReturn(1);

        $dirtyFlag = $this->createMock(DirtyFlag::class);
        $dirtyFlag->expects($this->once())->method('clear');

        $cron = new RebuildProducts($config, $exporter, $dirtyFlag, new NullLogger());
        $cron->execute();
    }
}
